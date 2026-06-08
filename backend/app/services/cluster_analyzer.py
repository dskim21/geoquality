# backend/app/services/cluster_analyzer.py

import csv
from io import StringIO

import numpy as np
from sklearn.cluster import DBSCAN


def is_valid_coordinate(latitude: float, longitude: float) -> bool:
    return -90 <= latitude <= 90 and -180 <= longitude <= 180


def analyze_csv_clusters(content: str) -> dict:
    reader = csv.DictReader(StringIO(content))
    rows = list(reader)

    if not rows:
        return {
            "totalPoints": 0,
            "clusterCount": 0,
            "noiseCount": 0,
            "points": [],
        }

    required_columns = {"latitude", "longitude"}

    if not required_columns.issubset(reader.fieldnames or []):
        raise ValueError("CSV에는 latitude, longitude 컬럼이 포함되어야 합니다.")

    valid_points = []

    for index, row in enumerate(rows, start=2):
        raw_latitude = row.get("latitude", "")
        raw_longitude = row.get("longitude", "")

        try:
            latitude = float(raw_latitude)
            longitude = float(raw_longitude)
        except ValueError:
            continue

        if not is_valid_coordinate(latitude, longitude):
            continue

        valid_points.append(
            {
                "rowIndex": index,
                "latitude": latitude,
                "longitude": longitude,
                "name": row.get("name", ""),
            }
        )

    if not valid_points:
        return {
            "totalPoints": 0,
            "clusterCount": 0,
            "noiseCount": 0,
            "points": [],
        }

    # DBSCAN haversine metric은 라디안 좌표를 사용함
    coordinates_radians = np.radians(
        [[point["latitude"], point["longitude"]] for point in valid_points]
    )

    earth_radius_km = 6371.0088

    # 1.5km 반경 안에 2개 이상 있으면 클러스터로 판단
    eps_km = 1.5
    eps_radians = eps_km / earth_radius_km

    dbscan = DBSCAN(
        eps=eps_radians,
        min_samples=2,
        metric="haversine",
    )

    labels = dbscan.fit_predict(coordinates_radians)

    cluster_ids = {int(label) for label in labels if label != -1}

    result_points = []

    for point, label in zip(valid_points, labels):
        cluster_id = int(label)

        result_points.append(
            {
                **point,
                # sklearn DBSCAN은 cluster를 0부터 시작하므로 화면 표시용으로 +1
                "clusterId": cluster_id + 1 if cluster_id != -1 else -1,
                "isNoise": cluster_id == -1,
            }
        )

    return {
        "totalPoints": len(valid_points),
        "clusterCount": len(cluster_ids),
        "noiseCount": sum(1 for label in labels if label == -1),
        "points": result_points,
    }
