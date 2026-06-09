import xml.etree.ElementTree as ET


def validate_cvat_content(content: str) -> dict:
    root = ET.fromstring(content)

    boxes = root.findall(".//box")

    if not boxes:
        return {
            "qualityScore": 0,
            "totalAnnotations": 0,
            "validAnnotations": 0,
            "invalidAnnotations": 0,
            "errors": [],
        }

    errors = []
    valid_count = 0

    for index, box in enumerate(boxes, start=1):
        label = (box.get("label") or "").strip()

        xtl = float(box.get("xtl", 0))
        ytl = float(box.get("ytl", 0))
        xbr = float(box.get("xbr", 0))
        ybr = float(box.get("ybr", 0))

        has_error = False

        if not label:
            has_error = True

            errors.append(
                {
                    "annotationIndex": index,
                    "errorType": "EMPTY_LABEL",
                    "severity": "High",
                    "message": f"Annotation {index}: Label이 비어 있습니다.",
                }
            )

        if xbr <= xtl or ybr <= ytl:
            has_error = True

            errors.append(
                {
                    "annotationIndex": index,
                    "errorType": "INVALID_BBOX",
                    "severity": "High",
                    "message": f"Annotation {index}: Bounding Box 크기가 올바르지 않습니다.",
                }
            )

        if not has_error:
            valid_count += 1

    total_annotations = len(boxes)
    invalid_count = total_annotations - valid_count

    quality_score = int((valid_count / total_annotations) * 100 + 0.5)

    return {
        "qualityScore": quality_score,
        "totalAnnotations": total_annotations,
        "validAnnotations": valid_count,
        "invalidAnnotations": invalid_count,
        "errors": errors,
    }
