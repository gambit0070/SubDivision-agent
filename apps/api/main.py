from fastapi import FastAPI
from fastapi.responses import ORJSONResponse

app = FastAPI(
    title="Subdivision Evaluator API",
    version="0.0.1",
    default_response_class=ORJSONResponse,
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}