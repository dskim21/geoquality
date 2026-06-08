// frontend/src/api/validateApi.ts

export interface BackendCsvError {
    rowIndex: number
    latitude: string
    longitude: string
    errorType: string
    message: string
    isValid: boolean
}

export interface BackendCsvValidationResult {
    qualityScore: number
    totalRows: number
    validRows: number
    invalidRows: number
    errors: BackendCsvError[]
}

// FastAPI 서버 주소
const API_BASE_URL = 'http://localhost:8000'

// CSV 파일을 FastAPI 백엔드로 전송해 품질검사 실행
export async function validateCsvWithBackend(
    file: File,
): Promise<BackendCsvValidationResult> {
    const formData = new FormData()

    formData.append('file', file)

    const response = await fetch(`${API_BASE_URL}/api/validate/csv`, {
        method: 'POST',
        body: formData,
    })

    if (!response.ok) {
        const errorBody = await response.json().catch(() => null)

        throw new Error(
            errorBody?.detail ?? 'CSV 백엔드 검증 요청 중 오류가 발생했습니다.',
        )
    }

    return response.json()
}

export interface BackendGeoJsonValidationResult {
    qualityScore: number
    totalFeatures: number
    validFeatures: number
    invalidFeatures: number

    errorTypes: {
        geometryMissing: number
        duplicateGeometry: number
        missingValue: number
    }

    errors: Array<{
        featureIndex: number
        errorType: string
        message: string
    }>
}

// GeoJSON 파일을 FastAPI 백엔드로 전송해 품질검사 실행
export async function validateGeoJsonWithBackend(
    file: File,
): Promise<BackendGeoJsonValidationResult> {
    const formData = new FormData()

    formData.append('file', file)

    const response = await fetch(
        `${API_BASE_URL}/api/validate/geojson`,
        {
            method: 'POST',
            body: formData,
        },
    )

    if (!response.ok) {
        const errorBody = await response.json().catch(() => null)

        throw new Error(
            errorBody?.detail ??
            'GeoJSON 백엔드 검증 요청 중 오류가 발생했습니다.',
        )
    }

    return response.json()
}

export interface BackendClusterPoint {
    rowIndex: number
    latitude: number
    longitude: number
    name: string
    clusterId: number
    isNoise: boolean
}

export interface BackendClusterAnalysisResult {
    totalPoints: number
    clusterCount: number
    noiseCount: number
    points: BackendClusterPoint[]
}

// CSV 파일을 FastAPI 백엔드로 전송해 scikit-learn DBSCAN 클러스터 분석 실행
export async function analyzeCsvClustersWithBackend(
    file: File,
): Promise<BackendClusterAnalysisResult> {
    const formData = new FormData()

    formData.append('file', file)

    const response = await fetch(
        `${API_BASE_URL}/api/validate/csv/clusters`,
        {
            method: 'POST',
            body: formData,
        },
    )

    if (!response.ok) {
        const errorBody = await response.json().catch(() => null)

        throw new Error(
            errorBody?.detail ??
            'CSV 클러스터 분석 요청 중 오류가 발생했습니다.',
        )
    }

    return response.json()
}