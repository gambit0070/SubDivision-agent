from __future__ import annotations

import json
import logging
from time import perf_counter
from typing import Any

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("evaluate")
logger.setLevel(logging.INFO)


class EvaluateLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Логируем только /evaluate
        if request.url.path != "/evaluate":
            return await call_next(request)

        t0 = perf_counter()

        # ---- читаем компактный инпут ----
        try:
            body_bytes = await request.body()
            req_json: Any = json.loads(body_bytes.decode("utf-8")) if body_bytes else {}
        except Exception:
            req_json = {}

        prop = req_json.get("prop", {}) if isinstance(req_json, dict) else {}
        summary_in = {
            "land_area_sqm": prop.get("land_area_sqm"),
            "purchase_price": prop.get("purchase_price"),
            "r_code": prop.get("r_code"),
            "frontage_m": prop.get("frontage_m"),
        }

        # ---- вызываем следующий обработчик ----
        response = await call_next(request)
        elapsed_ms = (perf_counter() - t0) * 1000.0

        # ---- читаем JSON-ответ и возвращаем его как есть ----
        summary_out = {}
        try:
            body: bytes = b""

            # 1) пробуем готовое тело (у ORJSONResponse часто уже есть)
            raw = getattr(response, "body", None)
            if isinstance(raw, (bytes, bytearray)) and raw:
                body = bytes(raw)
            else:
                # 2) иначе буферизуем поток
                chunks = []
                async for chunk in response.body_iterator:
                    chunks.append(chunk)
                body = b"".join(chunks)

            if body:
                data = json.loads(body.decode("utf-8"))
                if isinstance(data, dict):
                    summary_out["lot_yield_estimate"] = data.get("lot_yield_estimate")
                    scenarios = data.get("scenarios") or []
                    if scenarios and isinstance(scenarios[0], dict):
                        summary_out["profit"] = scenarios[0].get("profit")
                        summary_out["margin_on_cost"] = scenarios[0].get("margin_on_cost")

                # вернуть тот же контент клиенту
                response = Response(
                    content=body,
                    status_code=response.status_code,
                    headers=dict(response.headers),
                    media_type=response.media_type,
                    background=response.background,
                )
        except Exception:
            # не ломаем ответ из-за проблем логгирования
            pass

        logger.info(
            "EVAL %s %s | %.1f ms | in=%s | out=%s",
            request.method,
            request.url.path,
            elapsed_ms,
            summary_in,
            summary_out,
        )
        return response