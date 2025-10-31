from fastapi import FastAPI
from fastapi.responses import ORJSONResponse
from apps.api.routes.evaluate import router as evaluate_router

app = FastAPI(
    title="Subdivision Evaluator API",
    version="0.0.1",
    default_response_class=ORJSONResponse,
)

app.include_router(evaluate_router)

@app.get("/health")
def health() -> dict:
    return {"status": "ok"}