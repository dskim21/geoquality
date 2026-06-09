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
import {
    analyzeCsvClustersWithBackend,
    validateCsvWithBackend,
    validateCvatWithBackend,
    validateGeoJsonWithBackend,
    validateLabelMeWithBackend,
    type BackendClusterAnalysisResult,
    type BackendCsvValidationResult,
    type BackendGeoJsonValidationResult,
    type CvatValidationResult,
    type LabelMeValidationResult,
} from '../../api/validateApi'
import {
    analyzeClusters,
    convertClusterResultToGeoJson,
    type ClusterAnalysisResult,
    type ClusterInputPoint,
} from '../../utils/spatialCluster'
import { exportAnnotationReportCsv } from '../../utils/exportAnnotationReportCsv'

// 파일 확장자를 확인해서 지원 가능한 형식인지 검사
function getFileExtension(fileName: string): SupportedFileType | null {
    const extension = fileName.split('.').pop()?.toLowerCase()

    if (extension === 'geojson' || extension === 'json' || extension === 'csv' || extension === 'xml') {
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

    // CSV 정상 좌표 기반 클러스터 분석 결과
    const [clusterResult, setClusterResult] =
        useState<ClusterAnalysisResult | null>(null)

    // 백엔드로 전송할 원본 파일 객체
    const [selectedRawFile, setSelectedRawFile] = useState<File | null>(null)

    // FastAPI에서 반환한 CSV 검증 결과
    const [backendResult, setBackendResult] =
        useState<BackendCsvValidationResult
            | null>(null)

    const [backendGeoJsonResult, setBackendGeoJsonResult] =
        useState<BackendGeoJsonValidationResult | null>(null)

    // FastAPI scikit-learn DBSCAN 클러스터 분석 결과
    const [backendClusterResult, setBackendClusterResult] =
        useState<BackendClusterAnalysisResult | null>(null)

    const [labelMeResult, setLabelMeResult] =
        useState<LabelMeValidationResult | null>(null)

    const [cvatResult, setCvatResult] =
        useState<CvatValidationResult | null>(null)

    // 백엔드 요청 중 로딩 상태
    const [isBackendValidating, setIsBackendValidating] = useState(false)

    // 품질검사 실행 엔진 선택
    const [validationMode, setValidationMode] =
        useState<'local' | 'fastapi'>('local')

    {
        backendGeoJsonResult && (
            <div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 p-4">
                <h3 className="font-semibold text-sky-800">
                    FastAPI GeoJSON Validation Result
                </h3>

                <div className="mt-4 grid gap-3 sm:grid-cols-4">
                    <div>
                        <p className="text-xs text-sky-700">
                            Quality Score
                        </p>

                        <p className="text-2xl font-black text-sky-900">
                            {backendGeoJsonResult.qualityScore}
                        </p>
                    </div>

                    <div>
                        <p className="text-xs text-sky-700">
                            Total Features
                        </p>

                        <p className="text-2xl font-black text-sky-900">
                            {backendGeoJsonResult.totalFeatures}
                        </p>
                    </div>

                    <div>
                        <p className="text-xs text-sky-700">
                            Valid Features
                        </p>

                        <p className="text-2xl font-black text-sky-900">
                            {backendGeoJsonResult.validFeatures}
                        </p>
                    </div>

                    <div>
                        <p className="text-xs text-sky-700">
                            Invalid Features
                        </p>

                        <p className="text-2xl font-black text-sky-900">
                            {backendGeoJsonResult.invalidFeatures}
                        </p>
                    </div>
                </div>
            </div>
        )
    }

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
        setBackendGeoJsonResult(null)
        setBackendClusterResult(null)
        setLabelMeResult(null)
        setCvatResult(null)

        // .geojson 파일만 GeoJSON 파서로 분석
        // .json 파일은 LabelMe JSON일 수 있으므로 로컬 GeoJSON 파싱을 건너뜀
        if (fileType === 'geojson') {
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

        // LabelMe JSON은 FastAPI Validation에서 검사하므로
        // 업로드 단계에서는 파일 정보만 유지
        if (fileType === 'json') {
            setGeoJsonSummary(null)
            setCsvSummary(null)
            setClusterResult(null)
            return
        }

        // xml 파일 처리
        if (fileType === 'xml') {
            setGeoJsonSummary(null)
            setCsvSummary(null)
            setClusterResult(null)
            return
        }

        // CSV 파일은 latitude / longitude 컬럼을 Point GeoJSON으로 변환
        if (fileType === 'csv') {
            try {
                const parsedSummary = await parseCsvFile(file)

                // CSV에서 정상 좌표만 추출해 클러스터 분석 실행
                const clusterInputPoints: ClusterInputPoint[] =
                    parsedSummary.reportRows
                        .filter((row) => row.isValid)
                        .map((row) => ({
                            id: String(row.rowIndex),
                            latitude: Number(row.latitude),
                            longitude: Number(row.longitude),
                        }))

                const analyzedClusters = analyzeClusters(clusterInputPoints)

                setCsvSummary(parsedSummary)
                setClusterResult(analyzedClusters)
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
        setBackendGeoJsonResult(null)
        setBackendClusterResult(null)
        setClusterResult(null)
        setIsBackendValidating(false)
        setLabelMeResult(null)
        setCvatResult(null)
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
            const clusterAnalysisResult =
                await analyzeCsvClustersWithBackend(selectedRawFile)

            setBackendResult(result)
            setBackendClusterResult(clusterAnalysisResult)
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

    async function handleGeoJsonBackendValidation() {
        if (!selectedRawFile || selectedFile?.type !== 'geojson') {
            setErrorMessage(
                'GeoJSON 파일만 백엔드 검증을 실행할 수 있습니다.',
            )
            return
        }

        try {
            setIsBackendValidating(true)
            setErrorMessage('')

            const result =
                await validateGeoJsonWithBackend(selectedRawFile)

            setBackendGeoJsonResult(result)
        } catch (error) {
            setBackendGeoJsonResult(null)

            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : 'GeoJSON 백엔드 검증 중 오류가 발생했습니다.',
            )
        } finally {
            setIsBackendValidating(false)
        }
    }

    async function handleLabelMeValidation() {
        if (!selectedRawFile) {
            setErrorMessage('LabelMe 파일을 선택해주세요.')
            return
        }

        try {
            setIsBackendValidating(true)
            setErrorMessage('')

            const result = await validateLabelMeWithBackend(selectedRawFile)

            setLabelMeResult(result)
        } catch (error) {
            setLabelMeResult(null)

            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : 'LabelMe 품질검사 중 오류가 발생했습니다.',
            )
        } finally {
            setIsBackendValidating(false)
        }
    }

    async function handleCvatValidation() {
        if (!selectedRawFile) {
            setErrorMessage('CVAT XML 파일을 선택해주세요.')
            return
        }

        try {
            setIsBackendValidating(true)
            setErrorMessage('')

            const result = await validateCvatWithBackend(selectedRawFile)

            setCvatResult(result)
        } catch (error) {
            setCvatResult(null)

            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : 'CVAT 품질검사 중 오류가 발생했습니다.',
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
                    지원 형식: .geojson, .json, .csv, .xml
                </p>

                <input
                    type="file"
                    accept=".geojson,.json,.csv,.xml"
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

            {/* 품질검사 엔진 선택 */}
            {selectedFile && (
                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">
                        Validation Engine
                    </p>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <button
                            type="button"
                            onClick={() => setValidationMode('local')}
                            className={[
                                'rounded-xl border px-4 py-3 text-left text-sm transition',
                                validationMode === 'local'
                                    ? 'border-sky-300 bg-sky-50 text-sky-800'
                                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                            ].join(' ')}
                        >
                            <p className="font-semibold">Local Validation</p>
                            <p className="mt-1 text-xs">
                                브라우저에서 즉시 품질검사를 실행합니다.
                            </p>
                        </button>

                        <button
                            type="button"
                            onClick={() => setValidationMode('fastapi')}
                            className={[
                                'rounded-xl border px-4 py-3 text-left text-sm transition',
                                validationMode === 'fastapi'
                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                            ].join(' ')}
                        >
                            <p className="font-semibold">FastAPI Validation</p>
                            <p className="mt-1 text-xs">
                                백엔드 Validation Engine으로 파일을 검증합니다.
                            </p>
                        </button>
                    </div>
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

                    {/* CSV 정상 좌표 기반 공간 클러스터 분석 결과 */}
                    {clusterResult && (
                        <div className="mt-5 rounded-2xl border border-violet-200 bg-violet-50 p-4">
                            <h4 className="font-semibold text-violet-900">
                                Spatial Cluster Analysis
                            </h4>

                            <p className="mt-1 text-sm text-violet-700">
                                정상 좌표를 대상으로 거리 기반 클러스터링을 수행한 결과입니다.
                            </p>

                            <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                <div className="rounded-xl bg-white p-4">
                                    <p className="text-xs font-medium uppercase tracking-wide text-violet-500">
                                        Cluster Count
                                    </p>
                                    <p className="mt-2 text-2xl font-black text-violet-900">
                                        {clusterResult.clusterCount}
                                    </p>
                                </div>

                                <div className="rounded-xl bg-white p-4">
                                    <p className="text-xs font-medium uppercase tracking-wide text-violet-500">
                                        Noise Points
                                    </p>
                                    <p className="mt-2 text-2xl font-black text-violet-900">
                                        {clusterResult.noiseCount}
                                    </p>
                                </div>

                                <div className="rounded-xl bg-white p-4">
                                    <p className="text-xs font-medium uppercase tracking-wide text-violet-500">
                                        Valid Points
                                    </p>
                                    <p className="mt-2 text-2xl font-black text-violet-900">
                                        {clusterResult.points.length}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

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

                    {/* 클러스터 결과를 지도에 표시 */}
                    {csvSummary.validFeatureCount > 0 && (
                        <GeoJsonPreviewMap
                            geoJson={
                                clusterResult
                                    ? convertClusterResultToGeoJson(clusterResult)
                                    : csvSummary.geoJson
                            }
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

            {/* FastAPI scikit-learn DBSCAN 클러스터 분석 결과 */}
            {backendClusterResult && (
                <div className="mt-5 rounded-2xl border border-violet-200 bg-violet-50 p-4">
                    <h3 className="font-semibold text-violet-900">
                        FastAPI DBSCAN Cluster Result
                    </h3>

                    <p className="mt-1 text-sm text-violet-700">
                        scikit-learn DBSCAN을 사용해 정상 좌표의 공간 클러스터를 분석한 결과입니다.
                    </p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-xl bg-white p-4">
                            <p className="text-xs font-medium uppercase tracking-wide text-violet-500">
                                Total Points
                            </p>
                            <p className="mt-2 text-2xl font-black text-violet-900">
                                {backendClusterResult.totalPoints}
                            </p>
                        </div>

                        <div className="rounded-xl bg-white p-4">
                            <p className="text-xs font-medium uppercase tracking-wide text-violet-500">
                                Cluster Count
                            </p>
                            <p className="mt-2 text-2xl font-black text-violet-900">
                                {backendClusterResult.clusterCount}
                            </p>
                        </div>

                        <div className="rounded-xl bg-white p-4">
                            <p className="text-xs font-medium uppercase tracking-wide text-violet-500">
                                Noise Points
                            </p>
                            <p className="mt-2 text-2xl font-black text-violet-900">
                                {backendClusterResult.noiseCount}
                            </p>
                        </div>
                    </div>

                    {/* 공간 이상치 리포트 */}
                    {backendClusterResult.noiseCount > 0 && (
                        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                            <h4 className="font-semibold text-amber-800">
                                Spatial Outlier Report
                            </h4>

                            <p className="mt-1 text-sm text-amber-700">
                                DBSCAN 군집에 포함되지 않은 공간 이상치입니다.
                            </p>

                            <div className="mt-3 space-y-2">
                                {backendClusterResult.points
                                    .filter((point) => point.isNoise)
                                    .map((point) => (
                                        <div
                                            key={point.rowIndex}
                                            className="rounded-lg bg-white p-3"
                                        >
                                            <p className="font-medium text-slate-900">
                                                Point #{point.rowIndex}
                                            </p>

                                            <p className="mt-1 text-sm text-slate-600">
                                                Latitude: {point.latitude}
                                            </p>

                                            <p className="text-sm text-slate-600">
                                                Longitude: {point.longitude}
                                            </p>

                                            <div className="mt-2 flex flex-wrap gap-2">
                                                <span className="inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                                                    Spatial Outlier
                                                </span>

                                                <span className="inline-flex rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
                                                    Severity: {point.severity}
                                                </span>
                                            </div>

                                            <p className="mt-2 text-xs text-slate-500">
                                                Reason: {point.reason}
                                            </p>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {backendGeoJsonResult && (
                <div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 p-4">
                    <h3 className="font-semibold text-sky-800">
                        FastAPI GeoJSON Validation Result
                    </h3>

                    <div className="mt-4 grid gap-3 sm:grid-cols-4">
                        <div>
                            <p className="text-xs text-sky-700">
                                Quality Score
                            </p>

                            <p className="text-2xl font-black text-sky-900">
                                {backendGeoJsonResult.qualityScore}
                            </p>
                        </div>

                        <div>
                            <p className="text-xs text-sky-700">
                                Total Features
                            </p>

                            <p className="text-2xl font-black text-sky-900">
                                {backendGeoJsonResult.totalFeatures}
                            </p>
                        </div>

                        <div>
                            <p className="text-xs text-sky-700">
                                Valid Features
                            </p>

                            <p className="text-2xl font-black text-sky-900">
                                {backendGeoJsonResult.validFeatures}
                            </p>
                        </div>

                        <div>
                            <p className="text-xs text-sky-700">
                                Invalid Features
                            </p>

                            <p className="text-2xl font-black text-sky-900">
                                {backendGeoJsonResult.invalidFeatures}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {
                labelMeResult && (
                    <div className="mt-5 rounded-2xl border border-fuchsia-200 bg-fuchsia-50 p-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-fuchsia-900">
                                LabelMe Annotation Quality Result
                            </h3>

                            <button
                                type="button"
                                onClick={() => exportAnnotationReportCsv(labelMeResult)}
                                className="rounded-lg bg-fuchsia-600 px-3 py-2 text-xs font-semibold text-white hover:bg-fuchsia-700"
                            >
                                Export CSV
                            </button>
                        </div>

                        <p className="mt-1 text-sm text-fuchsia-700">
                            AI 학습데이터 라벨링 결과의 Annotation 품질검사 결과입니다.
                        </p>

                        <div className="mt-4 grid gap-3 sm:grid-cols-4">
                            <div className="rounded-xl bg-white p-4">
                                <p className="min-h-[32px] text-xs font-medium uppercase tracking-wide text-fuchsia-500">
                                    Quality Score
                                </p>
                                <p className="mt-2 text-2xl font-black text-fuchsia-900">
                                    {labelMeResult.qualityScore}
                                </p>
                            </div>

                            <div className="rounded-xl bg-white p-4">
                                <p className="min-h-[32px] text-xs font-medium uppercase tracking-wide text-fuchsia-500">
                                    Total Annotations
                                </p>
                                <p className="mt-2 text-2xl font-black text-fuchsia-900">
                                    {labelMeResult.totalAnnotations}
                                </p>
                            </div>

                            <div className="rounded-xl bg-white p-4">
                                <p className="min-h-[32px] text-xs font-medium uppercase tracking-wide text-fuchsia-500">
                                    Valid
                                </p>
                                <p className="mt-2 text-2xl font-black text-fuchsia-900">
                                    {labelMeResult.validAnnotations}
                                </p>
                            </div>

                            <div className="rounded-xl bg-white p-4">
                                <p className="min-h-[32px] text-xs font-medium uppercase tracking-wide text-fuchsia-500">
                                    Invalid
                                </p>
                                <p className="mt-2 text-2xl font-black text-fuchsia-900">
                                    {labelMeResult.invalidAnnotations}
                                </p>
                            </div>
                        </div>

                        {/* Annotation 클래스 통계 */}
                        <div className="mt-4 rounded-xl border border-fuchsia-200 bg-white p-4">
                            <p className="text-sm font-semibold text-fuchsia-900">
                                Annotation Statistics
                            </p>

                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                <div className="rounded-lg bg-fuchsia-50 p-3">
                                    <p className="min-h-[32px] text-xs font-medium uppercase tracking-wide text-fuchsia-500">
                                        Class Count
                                    </p>
                                    <p className="mt-2 text-2xl font-black text-fuchsia-900">
                                        {labelMeResult.statistics.classCount}
                                    </p>
                                </div>

                                <div className="rounded-lg bg-fuchsia-50 p-3">
                                    <p className="min-h-[32px] text-xs font-medium uppercase tracking-wide text-fuchsia-500">
                                        Most Frequent Class
                                    </p>
                                    <p className="mt-2 text-2xl font-black text-fuchsia-900">
                                        {labelMeResult.statistics.mostFrequentClass ?? '-'}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-4 space-y-2">
                                {Object.entries(labelMeResult.statistics.classCounts).map(
                                    ([className, count]) => (
                                        <div
                                            key={className}
                                            className="flex items-center justify-between rounded-lg bg-fuchsia-50 px-3 py-2 text-sm"
                                        >
                                            <span className="font-medium text-fuchsia-900">
                                                {className}
                                            </span>
                                            <span className="font-semibold text-fuchsia-700">
                                                {count}
                                            </span>
                                        </div>
                                    ),
                                )}
                            </div>
                        </div>

                        {/* 클래스 불균형 감지 결과 */}
                        {labelMeResult.statistics.imbalanceDetected && (
                            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                                <p className="text-sm font-semibold text-amber-800">
                                    Dataset Quality Warning
                                </p>

                                <p className="mt-2 text-sm text-amber-700">
                                    특정 클래스가 전체 Annotation의 대부분을 차지하고 있습니다.
                                    AI 학습데이터 편향 가능성이 있습니다.
                                </p>

                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                    <div className="rounded-lg bg-white p-3">
                                        <p className="text-xs font-medium uppercase tracking-wide text-amber-500">
                                            Majority Class
                                        </p>

                                        <p className="mt-2 text-2xl font-black text-amber-900">
                                            {labelMeResult.statistics.mostFrequentClass}
                                        </p>
                                    </div>

                                    <div className="rounded-lg bg-white p-3">
                                        <p className="text-xs font-medium uppercase tracking-wide text-amber-500">
                                            Majority Ratio
                                        </p>

                                        <p className="mt-2 text-2xl font-black text-amber-900">
                                            {labelMeResult.statistics.majorityRatio}%
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {labelMeResult.errors.length > 0 && (
                            <div className="mt-4 rounded-xl border border-fuchsia-200 bg-white p-4">
                                <p className="text-sm font-semibold text-fuchsia-900">
                                    Annotation Error Report
                                </p>

                                <div className="mt-3 space-y-2">
                                    {labelMeResult.errors.map((error) => (
                                        <div
                                            key={`${error.annotationIndex}-${error.errorType}`}
                                            className="rounded-lg border border-fuchsia-100 bg-fuchsia-50 px-3 py-2 text-sm"
                                        >
                                            <p className="font-semibold text-fuchsia-900">
                                                Annotation #{error.annotationIndex} · {error.errorType}
                                            </p>

                                            <p className="mt-1 text-xs font-semibold text-red-600">
                                                Severity: {error.severity}
                                            </p>

                                            <p className="mt-1 text-fuchsia-700">
                                                {error.message}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )
            }

            {/* CVAT XML Annotation 품질검사 결과 */}
            {cvatResult && (
                <div className="mt-5 rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-indigo-900">
                            CVAT Annotation Quality Result
                        </h3>

                        <button
                            type="button"
                            onClick={() => exportAnnotationReportCsv(cvatResult)}
                            className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700"
                        >
                            Export CSV
                        </button>
                    </div>

                    <p className="mt-1 text-sm text-indigo-700">
                        CVAT XML 라벨링 결과의 Annotation 품질검사 결과입니다.
                    </p>

                    {/* CVAT 품질 점수 요약 */}
                    <div className="mt-4 grid gap-3 sm:grid-cols-4">
                        <div className="rounded-xl bg-white p-4">
                            <p className="min-h-[32px] text-xs font-medium uppercase tracking-wide text-indigo-500">
                                Quality Score
                            </p>
                            <p className="mt-2 text-2xl font-black text-indigo-900">
                                {cvatResult.qualityScore}
                            </p>
                        </div>

                        <div className="rounded-xl bg-white p-4">
                            <p className="min-h-[32px] text-xs font-medium uppercase tracking-wide text-indigo-500">
                                Total Annotations
                            </p>
                            <p className="mt-2 text-2xl font-black text-indigo-900">
                                {cvatResult.totalAnnotations}
                            </p>
                        </div>

                        <div className="rounded-xl bg-white p-4">
                            <p className="min-h-[32px] text-xs font-medium uppercase tracking-wide text-indigo-500">
                                Valid
                            </p>
                            <p className="mt-2 text-2xl font-black text-indigo-900">
                                {cvatResult.validAnnotations}
                            </p>
                        </div>

                        <div className="rounded-xl bg-white p-4">
                            <p className="min-h-[32px] text-xs font-medium uppercase tracking-wide text-indigo-500">
                                Invalid
                            </p>
                            <p className="mt-2 text-2xl font-black text-indigo-900">
                                {cvatResult.invalidAnnotations}
                            </p>
                        </div>
                    </div>

                    {/* CVAT Annotation 오류 상세 목록 */}
                    {cvatResult.errors.length > 0 && (
                        <div className="mt-4 rounded-xl border border-indigo-200 bg-white p-4">
                            <p className="text-sm font-semibold text-indigo-900">
                                CVAT Error Report
                            </p>

                            <div className="mt-3 space-y-2">
                                {cvatResult.errors.map((error) => (
                                    <div
                                        key={`${error.annotationIndex}-${error.errorType}`}
                                        className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm"
                                    >
                                        <p className="font-semibold text-indigo-900">
                                            Annotation #{error.annotationIndex} · {error.errorType}
                                        </p>

                                        <p className="mt-1 text-xs font-semibold text-red-600">
                                            Severity: {error.severity}
                                        </p>

                                        <p className="mt-1 text-indigo-700">
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

            {validationMode === 'fastapi' && (
                <button
                    type="button"
                    onClick={() => {
                        if (selectedFile?.type === 'csv') {
                            handleBackendValidation()
                            return
                        }

                        if (selectedFile?.type === 'geojson') {
                            handleGeoJsonBackendValidation()
                            return
                        }

                        if (selectedFile?.type === 'json') {
                            handleLabelMeValidation()
                            return
                        }

                        if (selectedFile?.type === 'xml') {
                            handleCvatValidation()
                            return
                        }
                    }}
                    disabled={!selectedFile || isBackendValidating}
                    className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 px-5 py-3 font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                >
                    <PlayCircle className="h-5 w-5" />
                    {isBackendValidating
                        ? '백엔드 검증 중...'
                        : 'FastAPI 품질검사 실행'}
                </button>
            )}
        </div>
    )
}