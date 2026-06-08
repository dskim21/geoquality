# backend/app/services/csv_validator.py

import csv
from io import StringIO


def is_valid_coordinate(latitude: float, longitude: float) -> bool:
    """위도/경도가 WGS84 범위 안에 있는지 검사"""
    return -90 <= latitude <= 90 and -180 <= longitude <= 180


def validate_csv_content(content: str) -> dict:
    """CSV 텍스트를 읽고 좌표 품질검사 결과를 반환"""
    reader = csv.DictReader(StringIO(content))

    rows = list(reader)

    if not rows:
        return {
            "qualityScore": 0,
            "totalRows": 0,
            "validRows": 0,
            "invalidRows": 0,
            "errors": [],
        }

    required_columns = {"latitude", "longitude"}

    if not required_columns.issubset(reader.fieldnames or []):
        raise ValueError("CSV에는 latitude, longitude 컬럼이 포함되어야 합니다.")

    errors = []
    valid_count = 0

    for index, row in enumerate(rows, start=2):
        raw_latitude = row.get("latitude", "")
        raw_longitude = row.get("longitude", "")

        try:
            latitude = float(raw_latitude)
            longitude = float(raw_longitude)
        except ValueError:
            errors.append(
                {
                    "rowIndex": index,
                    "latitude": raw_latitude,
                    "longitude": raw_longitude,
                    "errorType": "COORDINATE_PARSE_ERROR",
                    "message": "위도/경도는 숫자여야 합니다.",
                    "isValid": False,
                }
            )
            continue

        if not is_valid_coordinate(latitude, longitude):
            errors.append(
                {
                    "rowIndex": index,
                    "latitude": raw_latitude,
                    "longitude": raw_longitude,
                    "errorType": "COORDINATE_RANGE_ERROR",
                    "message": "위도는 -90~90, 경도는 -180~180 범위여야 합니다.",
                    "isValid": False,
                }
            )
            continue

        valid_count += 1

    total_rows = len(rows)
    invalid_count = len(errors)

    quality_score = round((valid_count / total_rows) * 100 + 0.5) if total_rows else 0

    return {
        "qualityScore": quality_score,
        "totalRows": total_rows,
        "validRows": valid_count,
        "invalidRows": invalid_count,
        "errors": errors,
    }
