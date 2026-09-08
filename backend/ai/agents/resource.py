import os

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

from ai.graph.state import HospitalState
from ai.prompts.prompts import RESOURCE_PROMPT
from ai.tools.facts import facts_json


def resource_node(state: HospitalState) -> dict:
    llm = ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0,
        api_key=os.getenv("OPENAI_API_KEY"),
    )
    query = state.get("user_query", "")
    snapshot = state.get("hospital_snapshot") or {}
    message = llm.invoke(
        [
            SystemMessage(content=RESOURCE_PROMPT),
            HumanMessage(
                content=(
                    f"Question:\n{query}\n\n"
                    f"Hospital facts from hospital.db (do not invent other numbers):\n"
                    f"{facts_json(snapshot)}"
                )
            ),
        ]
    )
    answer = message.content
    return {
        "resource_analysis": {"answer": answer},
        "final_response": {
            "routed_to": "resources",
            "agent": "Resource Agent",
            "answer": answer,
        },
    }
