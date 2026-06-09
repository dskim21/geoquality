# backend/app/services/labelme_validator.py

import json
from typing import Any


def calculate_polygon_area(points: list) -> float:
    """Shoelace formula로 polygon 면적 계산"""
    if len(points) < 3:
        return 0

    area = 0

    for index in range(len(points)):
        x1, y1 = points[index]
        x2, y2 = points[(index + 1) % len(points)]

        area += x1 * y2 - x2 * y1

    return abs(area) / 2


def validate_labelme_content(content: str) -> dict[str, Any]:
    """LabelMe JSON annotation 품질검사 실행"""
    data = json.loads(content)

    shapes = data.get("shapes")
    image_width = data.get("imageWidth")
    image_height = data.get("imageHeight")

    allowed_classes = {"dog", "person", "car"}

    if not isinstance(shapes, list):
        raise ValueError("LabelMe JSON에는 shapes 배열이 포함되어야 합니다.")

    if len(shapes) == 0:
        return {
            "qualityScore": 0,
            "totalAnnotations": 0,
            "validAnnotations": 0,
            "invalidAnnotations": 0,
            "errorTypes": {
                "emptyLabel": 0,
                "invalidPolygon": 0,
                "emptyAnnotation": 1,
            },
            "errors": [
                {
                    "annotationIndex": 0,
                    "errorType": "EMPTY_ANNOTATION",
                    "severity": "High",
                    "message": "Annotation이 비어 있습니다.",
                }
            ],
        }

    errors = []
    valid_count = 0
    class_counts: dict[str, int] = {}

    for index, shape in enumerate(shapes, start=1):
        label = shape.get("label", "")
        shape_type = shape.get("shape_type", "")
        points = shape.get("points", [])

        normalized_label = str(label).strip()

        if normalized_label:
            class_counts[normalized_label] = class_counts.get(normalized_label, 0) + 1

        has_error = False

        if str(label).strip() == "":
            has_error = True
            errors.append(
                {
                    "annotationIndex": index,
                    "errorType": "EMPTY_LABEL",
                    "severity": "High",
                    "message": f"Annotation {index}: 클래스 라벨이 비어 있습니다.",
                }
            )

        if normalized_label and normalized_label not in allowed_classes:
            has_error = True
            errors.append(
                {
                    "annotationIndex": index,
                    "errorType": "CLASS_TYPO",
                    "severity": "Medium",
                    "message": f"Annotation {index}: 허용되지 않은 클래스명입니다. ({normalized_label})",
                }
            )

        if shape_type == "polygon" and len(points) < 3:
            has_error = True
            errors.append(
                {
                    "annotationIndex": index,
                    "errorType": "INVALID_POLYGON",
                    "severity": "High",
                    "message": f"Annotation {index}: Polygon은 최소 3개 이상의 point가 필요합니다.",
                }
            )

        if shape_type == "polygon" and len(points) >= 3:
            polygon_area = calculate_polygon_area(points)

            if polygon_area == 0:
                has_error = True
                errors.append(
                    {
                        "annotationIndex": index,
                        "errorType": "ZERO_AREA_POLYGON",
                        "severity": "High",
                        "message": f"Annotation {index}: Polygon 면적이 0입니다.",
                    }
                )

        if image_width and image_height:
            for point in points:
                x, y = point

                if x < 0 or y < 0 or x > image_width or y > image_height:
                    has_error = True
                    errors.append(
                        {
                            "annotationIndex": index,
                            "errorType": "OUT_OF_IMAGE_BOUNDS",
                            "severity": "High",
                            "message": f"Annotation {index}: 이미지 영역을 벗어난 point가 있습니다.",
                        }
                    )
                    break

        if not has_error:
            valid_count += 1

    total_annotations = len(shapes)
    invalid_count = total_annotations - valid_count

    quality_score = int((valid_count / total_annotations) * 100 + 0.5)

    most_frequent_class = None

    if class_counts:
        most_frequent_class = max(
            class_counts.items(),
            key=lambda item: item[1],
        )[0]

    majority_ratio = 0
    imbalance_detected = False

    if class_counts and total_annotations > 0:
        majority_count = max(class_counts.values())
        majority_ratio = int((majority_count / total_annotations) * 100 + 0.5)
        imbalance_detected = majority_ratio >= 70

    return {
        "qualityScore": quality_score,
        "totalAnnotations": total_annotations,
        "validAnnotations": valid_count,
        "invalidAnnotations": invalid_count,
        "statistics": {
            "classCounts": class_counts,
            "classCount": len(class_counts),
            "mostFrequentClass": most_frequent_class,
            "majorityRatio": majority_ratio,
            "imbalanceDetected": imbalance_detected,
        },
        "errorTypes": {
            "emptyLabel": sum(
                1 for error in errors if error["errorType"] == "EMPTY_LABEL"
            ),
            "invalidPolygon": sum(
                1 for error in errors if error["errorType"] == "INVALID_POLYGON"
            ),
            "emptyAnnotation": 0,
            "classTypo": sum(
                1 for error in errors if error["errorType"] == "CLASS_TYPO"
            ),
            "outOfImageBounds": sum(
                1 for error in errors if error["errorType"] == "OUT_OF_IMAGE_BOUNDS"
            ),
            "zeroAreaPolygon": sum(
                1 for error in errors if error["errorType"] == "ZERO_AREA_POLYGON"
            ),
        },
        "errors": errors,
    }
