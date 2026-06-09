# backend/app/routers/annotation.py

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.services.labelme_validator import validate_labelme_content

from app.services.cvat_validator import validate_cvat_content

router = APIRouter(prefix="/api/annotation", tags=["annotation"])


@router.post("/labelme")
async def validate_labelme(file: UploadFile = File(...)):
    """LabelMe JSON 파일을 업로드받아 annotation 품질검사를 실행"""
    if not file.filename.endswith(".json"):
        raise HTTPException(
            status_code=400,
            detail="LabelMe JSON 파일만 업로드할 수 있습니다.",
        )

    content_bytes = await file.read()
    content = content_bytes.decode("utf-8-sig")

    try:
        return validate_labelme_content(content)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))


@router.post("/cvat")
async def validate_cvat(file: UploadFile = File(...)):
    if not file.filename.endswith(".xml"):
        raise HTTPException(
            status_code=400,
            detail="CVAT XML 파일만 업로드할 수 있습니다.",
        )

    content_bytes = await file.read()
    content = content_bytes.decode("utf-8-sig")

    try:
        return validate_cvat_content(content)

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )
