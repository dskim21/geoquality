# backend/app/services/cluster_analyzer.py

import csv
import math
from io import StringIO


def is_valid_coordinate(latitude: float, longitude: float) -> bool:
    return -90 <= latitude <= 90 and -180 <= longitude <= 180


def calculate_distance_km(point_a: dict, point_b: dict) -> float:
    """Haversine 공식을 사용해 두 좌표 사이의 거리를 km 단위로 계산"""
    earth_radius_km = 6371.0088

    lat1 = math.radians(point_a["latitude"])
    lat2 = math.radians(point_b["latitude"])
    delta_lat = math.radians(point_b["latitude"] - point_a["latitude"])
    delta_lng = math.radians(point_b["longitude"] - point_a["longitude"])

    a = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin(delta_lng / 2) ** 2
    )

    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return earth_radius_km * c


def find_neighbors(
    points: list[dict], target_index: int, radius_km: float
) -> list[int]:
    neighbors = []

    for index, point in enumerate(points):
        distance = calculate_distance_km(points[target_index], point)

        if distance <= radius_km:
            neighbors.append(index)

    return neighbors


def calculate_nearest_cluster_distance(
    point: dict,
    clustered_points: list[dict],
) -> float | None:
    """이상치 포인트와 가장 가까운 군집 포인트 사이의 거리 계산"""
    if not clustered_points:
        return None

    distances = [
        calculate_distance_km(point, clustered_point)
        for clustered_point in clustered_points
    ]

    return round(min(distances), 2)


def get_outlier_severity(distance_km: float | None) -> str:
    if distance_km is None:
        return "High"

    if distance_km >= 5:
        return "High"

    if distance_km >= 2:
        return "Medium"

    return "Low"


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

    radius_km = 1.5
    min_points = 2

    visited = set()
    labels = [0] * len(valid_points)
    cluster_id = 0

    for index in range(len(valid_points)):
        if index in visited:
            continue

        visited.add(index)

        neighbors = find_neighbors(valid_points, index, radius_km)

        if len(neighbors) < min_points:
            labels[index] = -1
            continue

        cluster_id += 1
        labels[index] = cluster_id

        queue = list(neighbors)

        while queue:
            neighbor_index = queue.pop(0)

            if neighbor_index not in visited:
                visited.add(neighbor_index)

                next_neighbors = find_neighbors(
                    valid_points,
                    neighbor_index,
                    radius_km,
                )

                if len(next_neighbors) >= min_points:
                    queue.extend(next_neighbors)

            if labels[neighbor_index] in (0, -1):
                labels[neighbor_index] = cluster_id

    clustered_points = [
        {
            **point,
            "clusterId": labels[index],
            "isNoise": labels[index] == -1,
        }
        for index, point in enumerate(valid_points)
    ]

    non_noise_points = [point for point in clustered_points if not point["isNoise"]]

    result_points = []

    for point in clustered_points:
        if point["isNoise"]:
            nearest_distance_km = calculate_nearest_cluster_distance(
                point,
                non_noise_points,
            )
            severity = get_outlier_severity(nearest_distance_km)

            result_points.append(
                {
                    **point,
                    "severity": severity,
                    "reason": "Far from nearest cluster",
                    "nearestClusterDistanceKm": nearest_distance_km,
                }
            )
        else:
            result_points.append(
                {
                    **point,
                    "severity": "Normal",
                    "reason": "Clustered point",
                    "nearestClusterDistanceKm": 0,
                }
            )

    return {
        "totalPoints": len(valid_points),
        "clusterCount": cluster_id,
        "noiseCount": sum(1 for label in labels if label == -1),
        "points": result_points,
    }
