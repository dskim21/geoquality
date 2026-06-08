// frontend/src/components/map/GeoJsonPreviewMap.tsx

import { useEffect } from 'react'
import { GeoJSON, MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { FeatureCollection } from 'geojson'
import type { BoundingBox } from '../../types/dataset'

interface GeoJsonPreviewMapProps {
    geoJson: FeatureCollection

    invalidGeoJson?: FeatureCollection

    boundingBox: BoundingBox | null
}

function FitBounds({ boundingBox }: { boundingBox: BoundingBox | null }) {
    const map = useMap()

    useEffect(() => {
        if (!boundingBox) return

        // Leaflet은 [위도, 경도] 순서를 사용함
        // GeoJSON은 [경도, 위도] 순서이므로 순서를 바꿔서 넣어야 함
        const southWest: [number, number] = [
            boundingBox.minLat,
            boundingBox.minLng,
        ]

        const northEast: [number, number] = [
            boundingBox.maxLat,
            boundingBox.maxLng,
        ]

        // 업로드한 데이터의 Bounding Box 기준으로 지도 중심과 확대 수준 자동 조정
        map.fitBounds([southWest, northEast], {
            padding: [40, 40],
            maxZoom: 15,
        })
    }, [boundingBox, map])

    return null
}

export function GeoJsonPreviewMap({
    geoJson,
    invalidGeoJson,
    boundingBox,
}: GeoJsonPreviewMapProps) {
    return (
        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <MapContainer
                center={[37.55, 127.0]}
                zoom={11}
                scrollWheelZoom={true}
                className="h-[360px] w-full"
            >
                {/* OpenStreetMap 기본 배경지도 */}
                <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* 업로드한 GeoJSON 데이터를 지도에 표시 */}
                <GeoJSON
                    key={geoJson.features
                        .map((feature) => {
                            const props = feature.properties ?? {}

                            return [
                                props.clusterId ?? 'no-cluster',
                                props.isNoise ?? false,
                                JSON.stringify(feature.geometry),
                            ].join('-')
                        })
                        .join('|')}
                    data={geoJson}
                    pointToLayer={(feature, latlng) => {
                        const clusterId = feature.properties?.clusterId
                        const isNoise = feature.properties?.isNoise

                        // 클러스터 분석 결과가 없는 일반 포인트
                        if (clusterId === undefined) {
                            return L.circleMarker(latlng, {
                                radius: 7,
                                color: '#0284c7',
                                fillColor: '#0ea5e9',
                                fillOpacity: 0.8,
                                weight: 2,
                            })
                        }

                        // 노이즈 포인트
                        if (isNoise) {
                            return L.circleMarker(latlng, {
                                radius: 7,
                                color: '#64748b',
                                fillColor: '#94a3b8',
                                fillOpacity: 0.8,
                                weight: 2,
                            })
                        }

                        // clusterId에 따라 색상 구분
                        const clusterColorMap: Record<number, string> = {
                            1: '#2563eb',
                            2: '#7c3aed',
                            3: '#16a34a',
                            4: '#f97316',
                        }

                        const color = clusterColorMap[clusterId] ?? '#0f766e'

                        return L.circleMarker(latlng, {
                            radius: 8,
                            color,
                            fillColor: color,
                            fillOpacity: 0.85,
                            weight: 2,
                        })
                    }}
                    onEachFeature={(feature, layer) => {
                        const clusterId = feature.properties?.clusterId
                        const isNoise = feature.properties?.isNoise

                        if (clusterId !== undefined) {
                            layer.bindPopup(
                                isNoise
                                    ? 'Noise Point'
                                    : `Cluster ${clusterId}`,
                            )
                        }
                    }}
                    style={{
                        color: '#0284c7',
                        weight: 3,
                        fillOpacity: 0.25,
                    }}
                />

                {/* 오류 좌표는 빨간색으로 표시 */}
                {invalidGeoJson && (
                    <GeoJSON
                        data={invalidGeoJson}
                        pointToLayer={(feature, latlng) =>
                            L.circleMarker(latlng, {
                                radius: 8,
                                color: '#dc2626',
                                fillColor: '#ef4444',
                                fillOpacity: 0.9,
                                weight: 2,
                            })
                        }
                    />
                )}

                {/* Bounding Box 기준으로 지도 자동 이동 */}
                <FitBounds boundingBox={boundingBox} />
            </MapContainer>

            {/* 지도 범례 */}
            <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Map Legend
                </p>

                <div className="flex flex-wrap gap-4 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-blue-600" />
                        <span>Cluster Point</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-slate-400" />
                        <span>Noise Point</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-red-500" />
                        <span>Invalid Coordinate</span>
                    </div>
                </div>
            </div>
        </div>
    )
}