// frontend/src/utils/fileParser.ts

import type { FeatureCollection } from 'geojson'
import type { BoundingBox } from '../types/dataset'

export interface ParsedGeoJsonSummary {
    fileName: string
    featureCount: number
    validFeatureCount: number
    invalidFeatureCount: number
    qualityScore: number
    geometryTypes: string[]
    propertyKeys: string[]
    boundingBox: BoundingBox | null
    crs: string
    geoJson: FeatureCollection
    geometryErrors: string[]
    duplicateErrors: string[]
    missingValueErrors: string[]
}

// BI 도구 연계를 위한 표준 검사 결과 행
export interface CsvReportRow {
    rowIndex: number
    latitude: string
    longitude: string

    errorType: string
    message: string

    isValid: boolean

    qualityScore: number

    properties: Record<string, string>
}

export interface CsvCoordinateError {
    rowNumber: number
    latitude: string
    longitude: string
    message: string
}

export interface ParsedCsvSummary {
    fileName: string
    featureCount: number
    validFeatureCount: number
    invalidFeatureCount: number
    qualityScore: number
    propertyKeys: string[]
    boundingBox: BoundingBox | null
    geoJson: FeatureCollection

    // 오류 좌표 시각화용
    invalidGeoJson: FeatureCollection

    reportRows: CsvReportRow[]
    coordinateErrors: CsvCoordinateError[]
}

type CoordinatePair = [number, number]

function collectCoordinates(coordinates: unknown, result: CoordinatePair[]) {
    if (!Array.isArray(coordinates)) return

    if (
        coordinates.length >= 2 &&
        typeof coordinates[0] === 'number' &&
        typeof coordinates[1] === 'number'
    ) {
        result.push([coordinates[0], coordinates[1]])
        return
    }

    coordinates.forEach((child) => collectCoordinates(child, result))
}

function calculateBoundingBox(coordinates: CoordinatePair[]): BoundingBox | null {
    if (coordinates.length === 0) return null

    const lngValues = coordinates.map(([lng]) => lng)
    const latValues = coordinates.map(([, lat]) => lat)

    return {
        minLng: Math.min(...lngValues),
        minLat: Math.min(...latValues),
        maxLng: Math.max(...lngValues),
        maxLat: Math.max(...latValues),
    }
}

function detectCrs(json: any) {
    if (json.crs?.properties?.name) {
        return json.crs.properties.name
    }

    return 'EPSG:4326 (추정)'
}

function isValidWgs84Coordinate(latitude: number, longitude: number) {
    return (
        Number.isFinite(latitude) &&
        Number.isFinite(longitude) &&
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180
    )
}

export async function parseGeoJsonFile(
    file: File,
): Promise<ParsedGeoJsonSummary> {
    const text = await file.text()
    const json = JSON.parse(text)

    if (json.type !== 'FeatureCollection' || !Array.isArray(json.features)) {
        throw new Error('FeatureCollection 형식의 GeoJSON 파일만 지원합니다.')
    }

    const geometryTypes = new Set<string>()
    const propertyKeys = new Set<string>()
    const coordinates: CoordinatePair[] = []

    // Geometry 누락 오류 목록
    const geometryErrors: string[] = []

    // 중복 Geometry 오류 목록
    const duplicateErrors: string[] = []

    // 속성값 결측치 오류 목록
    const missingValueErrors: string[] = []

    // 중복 검사용 Geometry 문자열 저장소
    const geometryMap = new Map<string, number>()

    let validFeatureCount = 0

    json.features.forEach((feature: any, index: number) => {
        const featureNumber = index + 1

        // Geometry가 없는 Feature는 오류로 기록하고 공간분석 대상에서 제외
        if (!feature.geometry) {
            geometryErrors.push(`Feature ${featureNumber}: Geometry 정보가 없습니다.`)
            return
        }

        validFeatureCount++

        // Geometry 타입 수집
        if (feature.geometry.type) {
            geometryTypes.add(feature.geometry.type)
        }

        // 속성 필드명 수집
        Object.keys(feature.properties ?? {}).forEach((key) => {
            propertyKeys.add(key)
        })

        // 속성값 결측치 검사
        Object.entries(feature.properties ?? {}).forEach(([key, value]) => {
            const isMissingValue =
                value === null ||
                value === undefined ||
                String(value).trim() === ''

            if (isMissingValue) {
                missingValueErrors.push(
                    `Feature ${featureNumber}: ${key} 값이 비어 있습니다.`,
                )
            }
        })

        // Bounding Box 계산용 좌표 수집
        collectCoordinates(feature.geometry.coordinates, coordinates)

        // Geometry 객체를 문자열로 변환해 동일한 좌표/형태가 있는지 비교
        const geometryKey = JSON.stringify(feature.geometry)
        const duplicatedFrom = geometryMap.get(geometryKey)

        if (duplicatedFrom) {
            duplicateErrors.push(
                `Feature ${featureNumber}: Feature ${duplicatedFrom}와 동일한 Geometry입니다.`,
            )
        } else {
            geometryMap.set(geometryKey, featureNumber)
        }
    })

    // Rule-based Quality Scoring
    const geometryPenalty =
        geometryErrors.length * 30

    const duplicatePenalty =
        duplicateErrors.length * 20

    const missingValuePenalty =
        missingValueErrors.length * 10

    const totalPenalty =
        geometryPenalty +
        duplicatePenalty +
        missingValuePenalty

    const qualityScore =
        Math.max(
            0,
            100 - totalPenalty,
        )

    return {
        fileName: file.name,
        featureCount: json.features.length,
        validFeatureCount,
        invalidFeatureCount:
            geometryErrors.length +
            duplicateErrors.length +
            missingValueErrors.length,
        qualityScore,
        geometryTypes: Array.from(geometryTypes),
        propertyKeys: Array.from(propertyKeys),
        boundingBox: calculateBoundingBox(coordinates),
        crs: detectCrs(json),
        geoJson: json,
        geometryErrors,
        duplicateErrors,
        missingValueErrors,
    }
}

// CSV 한 줄을 콤마 기준으로 나누고,
// 엑셀/윈도우 CSV에서 생길 수 있는 BOM 문자를 제거
function parseCsvRow(row: string) {
    return row
        .split(',')
        .map((value) => value.replace(/^\uFEFF/, '').trim())
}

export async function parseCsvFile(file: File): Promise<ParsedCsvSummary> {
    const text = await file.text()

    const rows = text
        .split('\n')
        .map((row) => row.trim())
        .filter(Boolean)

    if (rows.length < 2) {
        throw new Error('CSV 데이터가 비어 있습니다.')
    }

    const headers = parseCsvRow(rows[0])

    const latitudeIndex = headers.findIndex(
        (header) => header.toLowerCase() === 'latitude',
    )
    const longitudeIndex = headers.findIndex(
        (header) => header.toLowerCase() === 'longitude',
    )

    if (latitudeIndex === -1 || longitudeIndex === -1) {
        throw new Error('CSV에는 latitude, longitude 컬럼이 포함되어야 합니다.')
    }

    const coordinates: CoordinatePair[] = []
    const coordinateErrors: CsvCoordinateError[] = []
    const reportRows: CsvReportRow[] = []
    const invalidFeatures: any[] = []

    const features = rows.slice(1).flatMap((row, index) => {
        const values = parseCsvRow(row)

        const rawLatitude = values[latitudeIndex] ?? ''
        const rawLongitude = values[longitudeIndex] ?? ''

        const latitude = Number(rawLatitude)
        const longitude = Number(rawLongitude)

        const properties: Record<string, string> = {}

        headers.forEach((header, headerIndex) => {
            properties[header] = values[headerIndex] ?? ''
        })

        const isValidCoordinate = isValidWgs84Coordinate(latitude, longitude)

        if (!isValidCoordinate) {
            coordinateErrors.push({
                rowNumber: index + 2,
                latitude: rawLatitude,
                longitude: rawLongitude,
                message: '위도는 -90~90, 경도는 -180~180 범위여야 합니다.',
            })

            // BI Export용 오류 행 저장
            reportRows.push({
                rowIndex: index + 2,
                latitude: rawLatitude,
                longitude: rawLongitude,
                errorType: 'COORDINATE_RANGE_ERROR',
                message: '위도는 -90~90, 경도는 -180~180 범위여야 합니다.',
                isValid: false,
                qualityScore: 0,
                properties,
            })

            return []
        }

        coordinates.push([longitude, latitude])

        // BI Export용 정상 행 저장
        reportRows.push({
            rowIndex: index + 2,
            latitude: rawLatitude,
            longitude: rawLongitude,
            errorType: '',
            message: '정상',
            isValid: true,
            qualityScore: 0,
            properties,
        })

        return [
            {
                type: 'Feature' as const,
                id: index + 1,
                properties,
                geometry: {
                    type: 'Point' as const,
                    coordinates: [longitude, latitude],
                },
            },
        ]
    })

    const geoJson: FeatureCollection = {
        type: 'FeatureCollection',
        features,
    }

    const invalidGeoJson: FeatureCollection = {
        type: 'FeatureCollection',
        features: invalidFeatures,
    }

    const qualityScore =
        rows.length > 1 ? Math.round((features.length / (rows.length - 1)) * 100) : 0

    reportRows.forEach((row) => {
        row.qualityScore = qualityScore
    })

    return {
        fileName: file.name,
        featureCount: rows.length - 1,
        validFeatureCount: features.length,
        invalidFeatureCount: coordinateErrors.length,
        qualityScore,
        propertyKeys: headers,
        boundingBox: calculateBoundingBox(coordinates),
        geoJson,
        invalidGeoJson,
        reportRows,
        coordinateErrors,
    }
}