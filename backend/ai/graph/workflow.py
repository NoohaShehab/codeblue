import os
from importlib import import_module

from dotenv import load_dotenv

# Load LangGraph dynamically so static analysis does not fail when the optional
# dependency is installed outside the type checker's configured environment.
_langgraph = import_module("langgraph.graph")
END = _langgraph.END
START = _langgraph.START
StateGraph = _langgraph.StateGraph

from ai.agents.facts import facts_node
from ai.agents.operations import operations_node
from ai.agents.recommendation import recommendation_node
from ai.agents.resource import resource_node
from ai.agents.simulation import simulation_node
from ai.agents.supervisor import supervisor_node
from ai.graph.state import HospitalState

load_dotenv()


def route_after_supervisor(state: HospitalState) -> str:
    routing = state.get("routing_decision") or {}
    route = routing.get("route")
    query = (state.get("user_query") or "").lower()
    if (
        route == "simulate"
        or state.get("scenario")
        or "what if" in query
        or "what-if" in query
        or "simulate" in query
    ):
        return "simulate"
    if route == "resources":
        return "resource"
    return "operations"


def build_graph():
    graph = StateGraph(HospitalState)
    graph.add_node("facts", facts_node)
    graph.add_node("supervisor", supervisor_node)
    graph.add_node("operations", operations_node)
    graph.add_node("resource", resource_node)
    graph.add_node("simulate", simulation_node)
    graph.add_node("recommendation", recommendation_node)

    graph.add_edge(START, "facts")
    graph.add_edge("facts", "supervisor")
    graph.add_conditional_edges(
        "supervisor",
        route_after_supervisor,
        {
            "operations": "operations",
            "resource": "resource",
            "simulate": "simulate",
        },
    )
    graph.add_edge("operations", "recommendation")
    graph.add_edge("resource", "recommendation")
    graph.add_edge("simulate", "recommendation")
    graph.add_edge("recommendation", END)
    return graph.compile()


def run_query(query: str, scenario: dict | None = None) -> HospitalState:
    if not os.getenv("OPENAI_API_KEY"):
        raise RuntimeError("OPENAI_API_KEY is not set")
    app = build_graph()
    payload: HospitalState = {"user_query": query}
    if scenario:
        payload["scenario"] = scenario
    return app.invoke(payload)
