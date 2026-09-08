from copy import deepcopy
from typing import Any, Dict, List

from ai.schemas.scenario import ScenarioInput


def _occupancy(occupied: int, total: int) -> float:
    if total <= 0:
        return 0.0
    return round(min(100.0, occupied / total * 100.0), 1)


def _pressure(occupancy_pct: float, waiting: int, available: int) -> float:
    score = occupancy_pct + min(waiting, 20) * 1.2 + (8 if available <= 1 else 0)
    return round(min(99.0, max(0.0, score)), 1)


def _dept(snapshot: Dict[str, Any], key: str) -> Dict[str, Any]:
    return deepcopy(snapshot.get(key) or {})


def run_simulation(snapshot: Dict[str, Any], scenario: ScenarioInput) -> Dict[str, Any]:
    """
    Operational planning prototype. Arithmetic capacity sketch only —
    not a scientifically validated hospital simulator.
    """
    er = _dept(snapshot, "er")
    icu = _dept(snapshot, "icu")
    waiting = snapshot.get("waiting") or {}
    flow = snapshot.get("flow_24h") or {}

    er_total = int(er.get("total_beds") or 0)
    er_occupied = int(er.get("occupied_beds") or 0)
    er_available = int(er.get("available_beds") or 0)
    icu_total = int(icu.get("total_beds") or 0)
    icu_occupied = int(icu.get("occupied_beds") or 0)
    icu_available = int(icu.get("available_beds") or 0)
    recent_waiting = int(waiting.get("waiting_transfers_recent") or 0)
    arrivals_24h = int(flow.get("arrivals") or 0)

    extra_arrivals = int(round(max(arrivals_24h, er_occupied) * scenario.er_arrivals_change))
    # Positive arrival shock consumes ER beds / increases wait; negative frees pressure.
    er_occupied_s = max(0, er_occupied + max(extra_arrivals, 0))
    overflow = max(0, er_occupied_s - er_total)
    er_occupied_s = min(er_occupied_s, er_total)
    er_available_s = max(0, er_total - er_occupied_s - int(er.get("maintenance_beds") or 0))
    waiting_s = max(0, recent_waiting + overflow + max(extra_arrivals, 0) // 3)

    icu_total_s = max(0, icu_total - scenario.icu_beds_unavailable)
    icu_occupied_s = icu_occupied + scenario.additional_icu_admissions + scenario.delayed_discharges
    icu_overflow = max(0, icu_occupied_s - icu_total_s)
    icu_occupied_s = min(icu_occupied_s, icu_total_s)
    icu_available_s = max(0, icu_total_s - icu_occupied_s)

    hospital_available_b = er_available + icu_available
    hospital_available_s = er_available_s + icu_available_s

    er_occ_b = _occupancy(er_occupied, er_total)
    er_occ_s = _occupancy(er_occupied_s, er_total)
    icu_occ_b = _occupancy(icu_occupied, icu_total)
    icu_occ_s = _occupancy(icu_occupied_s, icu_total_s)

    er_pressure_b = _pressure(er_occ_b, recent_waiting, er_available)
    er_pressure_s = _pressure(er_occ_s, waiting_s, er_available_s)
    wait_delta = max(0, extra_arrivals) + scenario.delayed_discharges * 3 + overflow * 2

    bottlenecks: List[str] = []
    warnings: List[str] = []
    if er_occ_s >= 90 or er_available_s <= 1:
        bottlenecks.append("ER bed capacity")
        warnings.append("Scenario estimate: ER occupancy is in a critical range.")
    if icu_occ_s >= 90 or icu_available_s <= 1:
        bottlenecks.append("ICU bed capacity")
        warnings.append("Scenario estimate: ICU buffer is too small for additional demand.")
    if waiting_s >= 10:
        bottlenecks.append("ER-to-ICU transfer queue")
        warnings.append("Scenario estimate: transfer wait is elevated.")
    if icu_overflow > 0:
        warnings.append(f"Scenario estimate: {icu_overflow} ICU demand cannot be placed within remaining staffed beds.")
    if scenario.icu_beds_unavailable:
        warnings.append("Scenario estimate: unavailable ICU beds reduce effective capacity.")

    def metrics(prefix_er_occ, prefix_icu_occ, prefix_er_p, avail, wait, occupied_er, occupied_icu, avail_er, avail_icu, total_icu):
        return {
            "er_occupancy_percent": prefix_er_occ,
            "icu_occupancy_percent": prefix_icu_occ,
            "er_pressure": prefix_er_p,
            "available_beds": avail,
            "er_occupied_beds": occupied_er,
            "icu_occupied_beds": occupied_icu,
            "er_available_beds": avail_er,
            "icu_available_beds": avail_icu,
            "icu_effective_beds": total_icu,
            "waiting_recent": wait,
        }

    baseline_metrics = metrics(
        er_occ_b, icu_occ_b, er_pressure_b, hospital_available_b, recent_waiting,
        er_occupied, icu_occupied, er_available, icu_available, icu_total,
    )
    scenario_metrics = metrics(
        er_occ_s, icu_occ_s, er_pressure_s, hospital_available_s, waiting_s,
        er_occupied_s, icu_occupied_s, er_available_s, icu_available_s, icu_total_s,
    )

    changes = {
        "er_occupancy_percent": round(er_occ_s - er_occ_b, 1),
        "icu_occupancy_percent": round(icu_occ_s - icu_occ_b, 1),
        "er_pressure": round(er_pressure_s - er_pressure_b, 1),
        "available_beds": hospital_available_s - hospital_available_b,
        "waiting_recent": waiting_s - recent_waiting,
        "wait_time_index": wait_delta,
        "extra_er_arrivals_estimate": extra_arrivals,
        "icu_overflow": icu_overflow,
    }

    return {
        "label": "operational_planning_prototype",
        "disclaimer": "Scenario estimate from a deterministic planning sketch. Not a validated hospital simulator.",
        "scenario": scenario.model_dump(),
        "baseline": baseline_metrics,
        "scenario_metrics": scenario_metrics,
        "changes": changes,
        "bottlenecks": bottlenecks,
        "warnings": warnings,
        "pressure": {"baseline": er_pressure_b, "scenario": er_pressure_s},
    }
