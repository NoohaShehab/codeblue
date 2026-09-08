import os
from typing import Literal

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

from ai.graph.state import HospitalState
from ai.prompts.prompts import SUPERVISOR_PROMPT


class SupervisorRoute(BaseModel):
    """Structured routing choice from the supervisor. No chain-of-thought."""

    route: Literal["operations", "resources", "simulate"] = Field(
        description="operations for flow/crowding; resources for beds/staff/equipment; simulate for what-if"
    )
    reason: str = Field(
        description="A short label for the classification, not step-by-step reasoning"
    )


def supervisor_node(state: HospitalState) -> dict:
    llm = ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0,
        api_key=os.getenv("OPENAI_API_KEY"),
    ).with_structured_output(SupervisorRoute)

    query = state.get("user_query", "")
    decision = llm.invoke(
        [
            SystemMessage(content=SUPERVISOR_PROMPT),
            HumanMessage(content=query),
        ]
    )

    route = decision.route
    lowered = query.lower()
    if any(token in lowered for token in ("what if", "what-if", "simulate", "scenario")):
        route = "simulate"

    return {
        "routing_decision": {
            "route": route,
            "reason": decision.reason,
        }
    }
