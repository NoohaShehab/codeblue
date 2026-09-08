from ai.simulation.simulation_engine import run_simulation
from ai.schemas.scenario import ScenarioInput


snapshot = {
    "er": {
        "total_beds": 20,
        "occupied_beds": 14,
        "available_beds": 6,
        "maintenance_beds": 0
    },
    "icu": {
        "total_beds": 10,
        "occupied_beds": 7,
        "available_beds": 3
    },
    "waiting": {
        "waiting_transfers_recent": 4
    },
    "flow_24h": {
        "arrivals": 30
    }
}


scenario = ScenarioInput(
    er_arrivals_change=0.20,
    icu_beds_unavailable=2,
    additional_icu_admissions=3,
    delayed_discharges=2
)


result = run_simulation(snapshot, scenario)

print("\n===== SIMULATION RESULT =====")

print("Baseline:")
print(result["baseline"])

print("\nScenario:")
print(result["scenario_metrics"])

print("\nChanges:")
print(result["changes"])

print("\nBottlenecks:")
print(result["bottlenecks"])

print("\nWarnings:")
print(result["warnings"])