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
                scrollWheelZoom={false}
                className="h-[360px] w-full"
            >
                {/* OpenStreetMap 기본 배경지도 */}
                <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* 업로드한 GeoJSON 데이터를 지도에 표시 */}
                <GeoJSON
                    data={geoJson}
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
        </div>
    )
}