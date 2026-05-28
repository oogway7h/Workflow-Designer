from pydantic import BaseModel, Field
from typing import List

class SuggestFieldRequest(BaseModel):
    policy_name: str
    task_name: str
    field_name: str
    user_context: str

class GeneratePolicyRequest(BaseModel):
    prompt: str
    departments: List[dict] = []

class ModifyDiagramRequest(BaseModel):
    prompt: str
    departments: list[dict] = Field(default_factory=list)
    current_diagram_json: dict = Field(alias='currentDiagramJson')

    model_config = {'populate_by_name': True}

class SuggestFieldResponse(BaseModel):
    suggestion: str

class ChatRequest(BaseModel):
    user_role: str
    current_screen: str
    user_message: str
    screen_data: str

class ChatResponse(BaseModel):
    reply: str

class Candidate(BaseModel):
    id: str
    name: str
    current_pending_tasks: int
    avg_completion_hours_history: float

class RecommendAssigneeRequest(BaseModel):
    task_name: str
    candidates: List[Candidate]

class RecommendAssigneeResponse(BaseModel):
    recommended_candidate_id: str
    justification: str

class ExecutionMetric(BaseModel):
    task: str
    avg_duration_hours: float
    expected_duration_hours: float

class AnalyticsBottlenecksRequest(BaseModel):
    policy_name: str
    total_instances_analyzed: int
    execution_metrics: List[ExecutionMetric]

class AnalyticsBottlenecksResponse(BaseModel):
    bottleneck_task: str
    analysis: str
    recommendations: List[str]

# --- NLP Models ---

class NlpNavigateRequest(BaseModel):
    spoken_text: str = Field(alias='spokenText')

    model_config = {'populate_by_name': True}

class NlpNavigateResponse(BaseModel):
    route: str

class NlpFillFormRequest(BaseModel):
    spoken_text: str = Field(alias='spokenText')
    form_schema: dict = Field(alias='formSchema')

    model_config = {'populate_by_name': True}

class NlpFillFormResponse(BaseModel):
    filled_form: dict


class NlpIntentRequest(BaseModel):
    spoken_text: str = Field(alias='spokenText')
    current_route: str = Field(default='', alias='currentRoute')

    model_config = {'populate_by_name': True}


class NlpIntentResponse(BaseModel):
    # Possible values: navigate | ask | generate_policy | fill_form
    intent: str
    spoken_text: str


# --- Auto-Assign Policy Models ---

class ActivityInfo(BaseModel):
    uuid: str
    name: str
    description: str
    lane_id: str | None = None
    lane_name: str | None = None

class EmployeeInfo(BaseModel):
    uuid: str
    name: str
    role_name: str | None = None
    current_pending_tasks: int = 0
    avg_completion_hours: float = 0.0

class ActivityAssignment(BaseModel):
    activity_uuid: str
    employee_uuid: str
    justification: str

class AutoAssignPolicyRequest(BaseModel):
    policy_name: str
    activities: list[ActivityInfo]
    employees: list[EmployeeInfo]

class AutoAssignPolicyResponse(BaseModel):
    assignments: list[ActivityAssignment]
