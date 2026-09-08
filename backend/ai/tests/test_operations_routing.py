import os
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


class _FakeRoute:
    route = "operations"
    reason = "ER crowding / patient flow"


class _FakeMessage:
    content = "Crowding usually happens when arrivals outpace discharges and downstream beds stay occupied."


def test_er_overcrowded_routes_to_operations_agent():
    fake_structured = MagicMock()
    fake_structured.invoke.return_value = _FakeRoute()

    fake_supervisor_llm = MagicMock()
    fake_supervisor_llm.with_structured_output.return_value = fake_structured

    fake_ops_llm = MagicMock()
    fake_ops_llm.invoke.return_value = _FakeMessage()

    with (
        patch("ai.agents.supervisor.ChatOpenAI", return_value=fake_supervisor_llm),
        patch("ai.agents.operations.ChatOpenAI", return_value=fake_ops_llm),
    ):
        from ai.graph.workflow import run_query

        result = run_query("Why is the ER overcrowded?")

    routing = result.get("routing_decision") or {}
    final = result.get("final_response") or {}

    assert routing.get("route") == "operations"
    assert final.get("routed_to") == "operations"
    assert final.get("agent") == "Operations Agent"
    assert "Crowding" in final.get("answer", "")
