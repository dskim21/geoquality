// frontend/src/components/upload/FileUploadCard.tsx

import { useState } from 'react'
import { Download, FileCheck2, FileUp, PlayCircle, XCircle } from 'lucide-react'
import type { SelectedDatasetFile, SupportedFileType } from '../../types/dataset'
import {
    parseCsvFile,
    parseGeoJsonFile,
    type ParsedCsvSummary,
    type ParsedGeoJsonSummary,
} from '../../utils/fileParser'
import { GeoJsonPreviewMap } from '../map/GeoJsonPreviewMap'
import { downloadCsvQualityReport } from '../../utils/csvExport'
import { QualityOverviewCards } from '../dashboard/QualityOverviewCards'
import { ErrorTypeChart } from '../dashboard/ErrorTypeChart'
import { GeoJsonQualityOverviewCards } from '../dashboard/GeoJsonQualityOverviewCards'
import { validateCsvWithBackend, type BackendCsvValidationResult } from '../../api/validateApi'

// 파일 확장자를 확인해서 지원 가능한 형식인지 검사
function getFileExtension(fileName: string): SupportedFileType | null {
    const extension = fileName.split('.').pop()?.toLowerCase()

    if (extension === 'geojson' || extension === 'json' || extension === 'csv') {
        return extension
    }

    return null
}

// 파일 크기를 KB 또는 MB 단위로 표시
function formatFileSize(size: number) {
    const sizeInKB = size / 1024

    if (sizeInKB < 1024) {
        return `${sizeInKB.toFixed(1)} KB`
    }

    return `${(sizeInKB / 1024).toFixed(1)} MB`
}

export function FileUploadCard() {
    // 사용자가 선택한 파일 정보
    const [selectedFile, setSelectedFile] =
        useState<SelectedDatasetFile | null>(null)

    // 업로드 또는 파싱 중 발생한 에러 메시지
    const [errorMessage, setErrorMessage] = useState('')

    // GeoJSON 파일을 프론트에서 미리 파싱한 요약 정보
    const [geoJsonSummary, setGeoJsonSummary] =
        useState<ParsedGeoJsonSummary | null>(null)

    // CSV 파일을 프론트에서 파싱한 요약 정보
    const [csvSummary, setCsvSummary] = useState<ParsedCsvSummary | null>(null)

    // 백엔드로 전송할 원본 파일 객체
    const [selectedRawFile, setSelectedRawFile] = useState<File | null>(null)

    // FastAPI에서 반환한 CSV 검증 결과
    const [backendResult, setBackendResult] =
        useState<BackendCsvValidationResult
            | null>(null)

    // 백엔드 요청 중 로딩 상태
    const [isBackendValidating, setIsBackendValidating] = useState(false)

    // GeoJSON 오류 목록을 ErrorTypeChart에서 사용할 수 있는 형태로 변환
    const geoJsonErrorRows = geoJsonSummary
        ? [
            ...geoJsonSummary.geometryErrors.map(() => ({
                errorType: 'GEOMETRY_MISSING',
            })),
            ...geoJsonSummary.duplicateErrors.map(() => ({
                errorType: 'DUPLICATE_GEOMETRY',
            })),
            ...geoJsonSummary.missingValueErrors.map(() => ({
                errorType: 'MISSING_VALUE',
            })),
        ]
        : []

    // 파일 선택 시 확장자 검사 후 파일 형식에 맞는 파서를 실행
    async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0]

        if (!file) return

        const fileType = getFileExtension(file.name)

        if (!fileType) {
            setSelectedFile(null)
            setGeoJsonSummary(null)
            setCsvSummary(null)
            setErrorMessage(
                '지원하지 않는 파일 형식입니다. GeoJSON, JSON, CSV만 업로드할 수 있습니다.',
            )
            return
        }

        setSelectedFile({
            name: file.name,
            size: file.size,
            type: fileType,
        })
        setErrorMessage('')

        setSelectedRawFile(file)
        setBackendResult(null)

        // GeoJSON / JSON 파일은 GeoJSON 파서로 분석
        if (fileType === 'geojson' || fileType === 'json') {
            try {
                const parsedSummary = await parseGeoJsonFile(file)

                setGeoJsonSummary(parsedSummary)
                setCsvSummary(null)
            } catch (error) {
                setSelectedFile(null)
                setGeoJsonSummary(null)
                setCsvSummary(null)
                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : 'GeoJSON 파일을 읽는 중 오류가 발생했습니다.',
                )
            }

            return
        }

        // CSV 파일은 latitude / longitude 컬럼을 Point GeoJSON으로 변환
        if (fileType === 'csv') {
            try {
                const parsedSummary = await parseCsvFile(file)

                setCsvSummary(parsedSummary)
                setGeoJsonSummary(null)
            } catch (error) {
                setSelectedFile(null)
                setGeoJsonSummary(null)
                setCsvSummary(null)
                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : 'CSV 파일을 읽는 중 오류가 발생했습니다.',
                )
            }
        }
    }

    // 선택한 파일과 미리보기 결과 초기화
    function handleClearFile() {
        setSelectedFile(null)
        setGeoJsonSummary(null)
        setCsvSummary(null)
        setErrorMessage('')
        setSelectedRawFile(null)
        setBackendResult(null)
        setIsBackendValidating(false)
    }

    // 선택한 CSV 파일을 FastAPI 백엔드로 전송해 품질검사를 실행
    async function handleBackendValidation() {
        if (!selectedRawFile || selectedFile?.type !== 'csv') {
            setErrorMessage('백엔드 검증은 CSV 파일에서만 실행할 수 있습니다.')
            return
        }

        try {
            setIsBackendValidating(true)
            setErrorMessage('')

            const result = await validateCsvWithBackend(selectedRawFile)

            setBackendResult(result)
        } catch (error) {
            setBackendResult(null)
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : '백엔드 검증 중 오류가 발생했습니다.',
            )
        } finally {
            setIsBackendValidating(false)
        }
    }

    return (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            {/* 카드 헤더 */}
            <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">
                    <FileUp className="h-5 w-5" />
                </div>

                <div>
                    <h2 className="text-xl font-bold text-slate-950">Upload Dataset</h2>
                    <p className="text-sm text-slate-500">
                        GeoJSON 또는 CSV 좌표 데이터를 업로드하세요.
                    </p>
                </div>
            </div>

            {/* 파일 선택 영역 */}
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <p className="text-sm font-medium text-slate-700">
                    파일을 선택하거나 여기에 드래그하세요
                </p>
                <p className="mt-2 text-xs text-slate-400">
                    지원 형식: .geojson, .json, .csv
                </p>

                <input
                    type="file"
                    accept=".geojson,.json,.csv"
                    onChange={handleFileChange}
                    className="mt-5 block w-full cursor-pointer rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-sky-500 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-sky-600"
                />
            </div>

            {/* 선택한 파일 정보 */}
            {selectedFile && (
                <div className="mt-5 flex items-center justify-between rounded-2xl border border-sky-200 bg-sky-50 p-4">
                    <div className="flex items-center gap-3">
                        <FileCheck2 className="h-5 w-5 text-sky-600" />
                        <div>
                            <p className="font-medium text-slate-900">{selectedFile.name}</p>
                            <p className="text-xs text-slate-500">
                                {selectedFile.type.toUpperCase()} ·{' '}
                                {formatFileSize(selectedFile.size)}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleClearFile}
                        className="text-slate-400 transition hover:text-red-500"
                    >
                        <XCircle className="h-5 w-5" />
                    </button>
                </div>
            )}

            {/* GeoJSON 미리보기 */}
            {geoJsonSummary && (
                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="font-semibold text-slate-900">GeoJSON Dataset Summary</h3>

                    {/* GeoJSON Geometry 유효성 기반 품질 점수 */}
                    <div className="mt-4 rounded-2xl border border-sky-200 bg-white p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Quality Score
                        </p>

                        <div className="mt-2 flex items-end gap-2">
                            <p className="text-4xl font-black text-sky-600">
                                {geoJsonSummary.qualityScore}
                            </p>

                            <p className="pb-1 text-sm font-semibold text-slate-500">/ 100</p>
                        </div>

                        <p className="mt-2 text-sm text-slate-500">
                            Geometry 존재 여부를 기준으로 계산한 GeoJSON 데이터 품질 점수입니다.
                        </p>
                    </div>

                    {/* GeoJSON 품질 요약 대시보드 */}
                    <GeoJsonQualityOverviewCards
                        geoJsonSummary={geoJsonSummary}
                    />

                    <ErrorTypeChart reportRows={geoJsonErrorRows} />

                    {/* GeoJSON에서 추출한 기본 메타데이터 */}
                    <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                            <p className="text-xs text-slate-500">Feature Count</p>
                            <p className="mt-1 font-semibold text-slate-900">
                                {geoJsonSummary.featureCount}
                            </p>
                        </div>

                        <div>
                            <p className="text-xs text-slate-500">Geometry Types</p>
                            <p className="mt-1 font-semibold text-slate-900">
                                {geoJsonSummary.geometryTypes.join(', ') || '-'}
                            </p>
                        </div>

                        <div>
                            <p className="text-xs text-slate-500">Property Fields</p>
                            <p className="mt-1 font-semibold text-slate-900">
                                {geoJsonSummary.propertyKeys.length}
                            </p>
                        </div>

                        <div>
                            <p className="text-xs text-slate-500">CRS</p>
                            <p className="mt-1 font-semibold text-slate-900">
                                {geoJsonSummary.crs}
                            </p>
                        </div>
                    </div>

                    {/* Bounding Box는 GIS 데이터의 공간 범위를 확인하기 위한 값 */}
                    {geoJsonSummary.boundingBox && (
                        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-sm">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                Bounding Box
                            </p>

                            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                <div>
                                    <p className="text-xs text-slate-500">Min Lng</p>
                                    <p className="font-semibold text-slate-900">
                                        {geoJsonSummary.boundingBox.minLng.toFixed(6)}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-slate-500">Min Lat</p>
                                    <p className="font-semibold text-slate-900">
                                        {geoJsonSummary.boundingBox.minLat.toFixed(6)}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-slate-500">Max Lng</p>
                                    <p className="font-semibold text-slate-900">
                                        {geoJsonSummary.boundingBox.maxLng.toFixed(6)}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs text-slate-500">Max Lat</p>
                                    <p className="font-semibold text-slate-900">
                                        {geoJsonSummary.boundingBox.maxLat.toFixed(6)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* GeoJSON Geometry 오류 목록 */}
                    {geoJsonSummary.geometryErrors.length > 0 && (
                        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
                            <p className="text-sm font-semibold text-red-700">
                                Geometry 오류 {geoJsonSummary.geometryErrors.length}건 발견
                            </p>

                            <div className="mt-3 space-y-2">
                                {geoJsonSummary.geometryErrors.map((error) => (
                                    <div
                                        key={error}
                                        className="rounded-lg bg-white px-3 py-2 text-sm text-red-600"
                                    >
                                        {error}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* GeoJSON 중복 Geometry 오류 목록 */}
                    {geoJsonSummary.duplicateErrors.length > 0 && (
                        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                            <p className="text-sm font-semibold text-amber-700">
                                중복 Geometry {geoJsonSummary.duplicateErrors.length}건 발견
                            </p>

                            <div className="mt-3 space-y-2">
                                {geoJsonSummary.duplicateErrors.map((error) => (
                                    <div
                                        key={error}
                                        className="rounded-lg bg-white px-3 py-2 text-sm text-amber-700"
                                    >
                                        {error}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* GeoJSON 속성값 결측치 오류 목록 */}
                    {geoJsonSummary.missingValueErrors.length > 0 && (
                        <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-4">
                            <p className="text-sm font-semibold text-orange-700">
                                속성값 결측치 {geoJsonSummary.missingValueErrors.length}건 발견
                            </p>

                            <div className="mt-3 space-y-2">
                                {geoJsonSummary.missingValueErrors.map((error) => (
                                    <div
                                        key={error}
                                        className="rounded-lg bg-white px-3 py-2 text-sm text-orange-700"
                                    >
                                        {error}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 업로드한 GeoJSON을 지도에서 바로 확인 */}
                    <GeoJsonPreviewMap
                        geoJson={geoJsonSummary.geoJson}
                        boundingBox={geoJsonSummary.boundingBox}
                    />

                    {/* 속성 필드 목록 */}
                    <div className="mt-4 flex flex-wrap gap-2">
                        {geoJsonSummary.propertyKeys.map((key) => (
                            <span
                                key={key}
                                className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-600"
                            >
                                {key}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* CSV 미리보기 */}
            {csvSummary && (
                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                        <h3 className="font-semibold text-slate-900">CSV Dataset Summary</h3>

                        {/* BI 도구 연계용 검사 결과 CSV 다운로드 */}
                        <button
                            type="button"
                            onClick={() => downloadCsvQualityReport(csvSummary)}
                            className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-4 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-50"
                        >
                            <Download className="h-4 w-4" />
                            Export BI Report CSV
                        </button>
                    </div>

                    {/* CSV 좌표 유효성 기반 품질 점수 */}
                    <div className="mt-4 rounded-2xl border border-sky-200 bg-white p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Quality Score
                        </p>
                        <div className="mt-2 flex items-end gap-2">
                            <p className="text-4xl font-black text-sky-600">
                                {csvSummary.qualityScore}
                            </p>
                            <p className="pb-1 text-sm font-semibold text-slate-500">/ 100</p>
                        </div>
                        <p className="mt-2 text-sm text-slate-500">
                            정상 좌표 비율을 기준으로 계산한 CSV 데이터 품질 점수입니다.
                        </p>
                    </div>

                    {/* BI 대시보드용 품질 요약 카드 */}
                    <QualityOverviewCards csvSummary={csvSummary} />

                    <ErrorTypeChart
                        reportRows={csvSummary.reportRows}
                    />

                    {/* 좌표 범위 오류가 있으면 오류 목록으로 표시 */}
                    {csvSummary.coordinateErrors.length > 0 && (
                        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
                            <p className="text-sm font-semibold text-red-700">
                                좌표 범위 오류 {csvSummary.coordinateErrors.length}건 발견
                            </p>

                            <div className="mt-3 space-y-2">
                                {csvSummary.coordinateErrors.map((error) => (
                                    <div
                                        key={error.rowNumber}
                                        className="rounded-lg bg-white px-3 py-2 text-sm text-red-600"
                                    >
                                        Row {error.rowNumber} · latitude: {error.latitude}, longitude:{' '}
                                        {error.longitude}
                                        <p className="mt-1 text-xs text-red-500">{error.message}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 범위를 벗어난 좌표는 실제 지도 위치가 아니므로 지도에서는 제외 */}
                    {csvSummary.invalidFeatureCount > 0 && (
                        <p className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                            좌표 범위를 벗어난 데이터는 실제 지도 위치로 표시할 수 없어 지도에서는 제외하고,
                            오류 목록과 BI Report CSV에 기록합니다.
                        </p>
                    )}

                    {/* 정상 좌표만 지도에 표시 */}
                    {csvSummary.validFeatureCount > 0 && (
                        <GeoJsonPreviewMap
                            geoJson={csvSummary.geoJson}
                            boundingBox={csvSummary.boundingBox}
                        />
                    )}

                    {/* CSV 컬럼 목록 */}
                    <div className="mt-4 flex flex-wrap gap-2">
                        {csvSummary.propertyKeys.map((key) => (
                            <span
                                key={key}
                                className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-600"
                            >
                                {key}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* FastAPI 백엔드 검증 결과 */}
            {backendResult && (
                <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <h3 className="font-semibold text-emerald-800">
                        FastAPI Validation Result
                    </h3>

                    <div className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
                        <div>
                            <p className="text-xs text-emerald-700">Quality Score</p>
                            <p className="mt-1 text-2xl font-black text-emerald-900">
                                {backendResult.qualityScore}
                            </p>
                        </div>

                        <div>
                            <p className="text-xs text-emerald-700">Total Rows</p>
                            <p className="mt-1 text-2xl font-black text-emerald-900">
                                {backendResult.totalRows}
                            </p>
                        </div>

                        <div>
                            <p className="text-xs text-emerald-700">Valid Rows</p>
                            <p className="mt-1 text-2xl font-black text-emerald-900">
                                {backendResult.validRows}
                            </p>
                        </div>

                        <div>
                            <p className="text-xs text-emerald-700">Invalid Rows</p>
                            <p className="mt-1 text-2xl font-black text-emerald-900">
                                {backendResult.invalidRows}
                            </p>
                        </div>
                    </div>

                    {/* FastAPI가 탐지한 오류 상세 목록 */}
                    {backendResult.errors.length > 0 && (
                        <div className="mt-4 rounded-xl border border-emerald-200 bg-white p-4">
                            <p className="text-sm font-semibold text-emerald-800">
                                Backend Error Details
                            </p>

                            <div className="mt-3 space-y-2">
                                {backendResult.errors.map((error) => (
                                    <div
                                        key={`${error.rowIndex}-${error.errorType}`}
                                        className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm"
                                    >
                                        <p className="font-semibold text-emerald-900">
                                            Row {error.rowIndex} · {error.errorType}
                                        </p>

                                        <p className="mt-1 text-emerald-700">
                                            latitude: {error.latitude}, longitude: {error.longitude}
                                        </p>

                                        <p className="mt-1 text-xs text-emerald-600">
                                            {error.message}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* 에러 메시지 */}
            {errorMessage && (
                <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {errorMessage}
                </p>
            )}

            {/* 백엔드 연결 전까지는 선택된 파일 여부만 기준으로 버튼 활성화 */}
            <button
                type="button"
                onClick={handleBackendValidation}
                disabled={!selectedFile || isBackendValidating}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 px-5 py-3 font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            >
                <PlayCircle className="h-5 w-5" />
                {isBackendValidating ? '백엔드 검증 중...' : 'FastAPI 품질검사 실행'}
            </button>
        </div>
    )
}