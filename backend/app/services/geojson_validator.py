# backend/app/services/geojson_validator.py

import json
from typing import Any


def validate_geojson_content(content: str) -> dict[str, Any]:
    """GeoJSON FeatureCollection 품질검사 실행"""
    data = json.loads(content)

    if data.get("type") != "FeatureCollection" or not isinstance(
        data.get("features"), list
    ):
        raise ValueError("FeatureCollection 형식의 GeoJSON 파일만 지원합니다.")

    features = data["features"]

    geometry_errors = []
    duplicate_errors = []
    missing_value_errors = []

    geometry_map: dict[str, int] = {}
    valid_count = 0

    for index, feature in enumerate(features, start=1):
        geometry = feature.get("geometry")
        properties = feature.get("properties") or {}

        if geometry is None:
            geometry_errors.append(
                {
                    "featureIndex": index,
                    "errorType": "GEOMETRY_MISSING",
                    "message": f"Feature {index}: Geometry 정보가 없습니다.",
                }
            )
            continue

        valid_count += 1

        geometry_key = json.dumps(geometry, sort_keys=True)
        duplicated_from = geometry_map.get(geometry_key)

        if duplicated_from:
            duplicate_errors.append(
                {
                    "featureIndex": index,
                    "errorType": "DUPLICATE_GEOMETRY",
                    "message": f"Feature {index}: Feature {duplicated_from}와 동일한 Geometry입니다.",
                }
            )
        else:
            geometry_map[geometry_key] = index

        for key, value in properties.items():
            if value is None or str(value).strip() == "":
                missing_value_errors.append(
                    {
                        "featureIndex": index,
                        "errorType": "MISSING_VALUE",
                        "field": key,
                        "message": f"Feature {index}: {key} 값이 비어 있습니다.",
                    }
                )

    error_count = (
        len(geometry_errors) + len(duplicate_errors) + len(missing_value_errors)
    )

    quality_score = max(
        0,
        100
        - len(geometry_errors) * 30
        - len(duplicate_errors) * 20
        - len(missing_value_errors) * 10,
    )

    return {
        "qualityScore": quality_score,
        "totalFeatures": len(features),
        "validFeatures": valid_count,
        "invalidFeatures": error_count,
        "errorTypes": {
            "geometryMissing": len(geometry_errors),
            "duplicateGeometry": len(duplicate_errors),
            "missingValue": len(missing_value_errors),
        },
        "errors": [
            *geometry_errors,
            *duplicate_errors,
            *missing_value_errors,
        ],
    }
