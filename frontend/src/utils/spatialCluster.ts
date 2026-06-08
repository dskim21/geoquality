// frontend/src/utils/spatialCluster.ts

import type { FeatureCollection, Point } from 'geojson'

// 클러스터 분석에 사용할 포인트 정보
export interface ClusterInputPoint {
    id: string
    latitude: number
    longitude: number
}

// 클러스터 분석 결과 포인트
export interface ClusteredPoint extends ClusterInputPoint {
    clusterId: number
    isNoise: boolean
}

// 클러스터 분석 요약 결과
export interface ClusterAnalysisResult {
    points: ClusteredPoint[]
    clusterCount: number
    noiseCount: number
}

// 두 좌표 사이의 대략적인 거리 계산
// MVP 단계에서는 Haversine 공식을 사용해 미터 단위 거리로 변환
function calculateDistanceMeters(
    pointA: ClusterInputPoint,
    pointB: ClusterInputPoint,
) {
    const earthRadiusMeters = 6371000

    const lat1 = (pointA.latitude * Math.PI) / 180
    const lat2 = (pointB.latitude * Math.PI) / 180
    const deltaLat = ((pointB.latitude - pointA.latitude) * Math.PI) / 180
    const deltaLng = ((pointB.longitude - pointA.longitude) * Math.PI) / 180

    const a =
        Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
        Math.cos(lat1) *
        Math.cos(lat2) *
        Math.sin(deltaLng / 2) *
        Math.sin(deltaLng / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return earthRadiusMeters * c
}

// 특정 포인트 주변의 이웃 포인트 인덱스 찾기
function findNeighbors(
    points: ClusterInputPoint[],
    targetIndex: number,
    radiusMeters: number,
) {
    const neighbors: number[] = []

    points.forEach((point, index) => {
        const distance = calculateDistanceMeters(points[targetIndex], point)

        if (distance <= radiusMeters) {
            neighbors.push(index)
        }
    })

    return neighbors
}

// MVP용 간단한 DBSCAN 유사 클러스터링
// radiusMeters: 같은 클러스터로 묶을 최대 거리
// minPoints: 클러스터로 인정할 최소 포인트 수
export function analyzeClusters(
    points: ClusterInputPoint[],
    radiusMeters = 1500,
    minPoints = 2,
): ClusterAnalysisResult {
    const visited = new Set<number>()
    const labels = new Array(points.length).fill(0)

    let clusterId = 0

    points.forEach((_, index) => {
        if (visited.has(index)) return

        visited.add(index)

        const neighbors = findNeighbors(points, index, radiusMeters)

        if (neighbors.length < minPoints) {
            labels[index] = -1
            return
        }

        clusterId++
        labels[index] = clusterId

        const queue = [...neighbors]

        while (queue.length > 0) {
            const neighborIndex = queue.shift()

            if (neighborIndex === undefined) continue

            if (!visited.has(neighborIndex)) {
                visited.add(neighborIndex)

                const nextNeighbors = findNeighbors(
                    points,
                    neighborIndex,
                    radiusMeters,
                )

                if (nextNeighbors.length >= minPoints) {
                    queue.push(...nextNeighbors)
                }
            }

            if (labels[neighborIndex] === 0 || labels[neighborIndex] === -1) {
                labels[neighborIndex] = clusterId
            }
        }
    })

    const clusteredPoints = points.map((point, index) => ({
        ...point,
        clusterId: labels[index],
        isNoise: labels[index] === -1,
    }))

    const noiseCount = clusteredPoints.filter((point) => point.isNoise).length

    return {
        points: clusteredPoints,
        clusterCount: clusterId,
        noiseCount,
    }
}

// 클러스터 결과를 지도 표시용 GeoJSON으로 변환
export function convertClusterResultToGeoJson(
    result: ClusterAnalysisResult,
): FeatureCollection<Point> {
    return {
        type: 'FeatureCollection',
        features: result.points.map((point) => ({
            type: 'Feature',
            properties: {
                id: point.id,
                clusterId: point.clusterId,
                isNoise: point.isNoise,
            },
            geometry: {
                type: 'Point',
                coordinates: [point.longitude, point.latitude],
            },
        })),
    }
}