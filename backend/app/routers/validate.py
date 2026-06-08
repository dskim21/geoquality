# backend/app/routers/validate.py

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.services.csv_validator import validate_csv_content

from app.services.geojson_validator import validate_geojson_content

from app.services.cluster_analyzer import analyze_csv_clusters

router = APIRouter(prefix="/api/validate", tags=["validate"])


@router.post("/csv")
async def validate_csv(file: UploadFile = File(...)):
    """CSV 파일을 업로드받아 좌표 품질검사를 실행"""
    if not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="CSV 파일만 업로드할 수 있습니다.",
        )

    content_bytes = await file.read()
    content = content_bytes.decode("utf-8-sig")

    try:
        return validate_csv_content(content)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))


@router.post("/geojson")
async def validate_geojson(file: UploadFile = File(...)):
    """GeoJSON 파일을 업로드받아 품질검사를 실행"""
    if not file.filename.endswith((".geojson", ".json")):
        raise HTTPException(
            status_code=400,
            detail="GeoJSON 또는 JSON 파일만 업로드할 수 있습니다.",
        )

    content_bytes = await file.read()
    content = content_bytes.decode("utf-8-sig")

    try:
        return validate_geojson_content(content)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))


@router.post("/csv/clusters")
async def analyze_csv_spatial_clusters(file: UploadFile = File(...)):
    """CSV 정상 좌표를 대상으로 scikit-learn DBSCAN 클러스터 분석 실행"""
    if not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="CSV 파일만 업로드할 수 있습니다.",
        )

    content_bytes = await file.read()
    content = content_bytes.decode("utf-8-sig")

    try:
        return analyze_csv_clusters(content)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))
