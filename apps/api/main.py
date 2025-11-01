from fastapi import FastAPI
from fastapi.responses import ORJSONResponse
from fastapi.middleware.cors import CORSMiddleware

from apps.api.routes.evaluate import router as evaluate_router
from apps.api.routes.health import router as health_router

import logging
import os
from apps.api.middleware.logging import EvaluateLoggingMiddleware


def get_allowed_origins() -> list[str]:
    # фронт в dev на 3000 + возможность задать свои домены через env
    origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
    extra = os.getenv("ALLOWED_ORIGINS", "")
    if extra:
        origins += [o.strip() for o in extra.split(",") if o.strip()]
    return origins


app = FastAPI(
    title="Subdivision Evaluator API",
    version="0.0.1",
    default_response_class=ORJSONResponse,
)

logging.basicConfig(level=logging.INFO)

# логирование запросов /evaluate (твоя middleware)
app.add_middleware(EvaluateLoggingMiddleware)

# CORS для фронта
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Роуты
app.include_router(health_router)     # ОСТАВЛЯЕМ этот health
app.include_router(evaluate_router)   # /evaluate