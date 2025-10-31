from fastapi import FastAPI
from fastapi.responses import ORJSONResponse
from apps.api.routes.evaluate import router as evaluate_router

import logging
from apps.api.middleware.logging import EvaluateLoggingMiddleware

app = FastAPI(
    title="Subdivision Evaluator API",
    version="0.0.1",
    default_response_class=ORJSONResponse,
)

logging.basicConfig(level=logging.INFO)

app.add_middleware(EvaluateLoggingMiddleware)

app.include_router(evaluate_router)

@app.get("/health")
def health() -> dict:
    return {"status": "ok"}