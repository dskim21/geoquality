// frontend/src/types/dataset.tsx

export type SupportedFileType = 'geojson' | 'json' | 'csv' | 'xml'

export interface SelectedDatasetFile {
    name: string
    size: number
    type: SupportedFileType
}

// GeoJSON 좌표 범위 정보를 표현하는 타입
export interface BoundingBox {
    minLng: number
    minLat: number
    maxLng: number
    maxLat: number
}