// frontend/src/utils/csvExport.ts

import type { ParsedCsvSummary } from './fileParser'

// CSV 셀 값 이스케이프 처리
function escapeCsvValue(value: string | number | boolean) {
    const escapedValue = String(value).replace(/"/g, '""')
    return `"${escapedValue}"`
}

// BI 도구 연계를 위한 CSV 다운로드
export function downloadCsvQualityReport(
    csvSummary: ParsedCsvSummary,
) {
    const headers = [
        'rowIndex',
        'latitude',
        'longitude',
        'errorType',
        'message',
        'isValid',
        'qualityScore',
    ]

    const rows = csvSummary.reportRows.map((row) => [
        row.rowIndex,
        row.latitude,
        row.longitude,
        row.errorType,
        row.message,
        row.isValid,
        row.qualityScore,
    ])

    const csvContent = [
        headers.map(escapeCsvValue).join(','),
        ...rows.map((row) => row.map(escapeCsvValue).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], {
        type: 'text/csv;charset=utf-8;',
    })

    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')

    link.href = url
    link.download = 'geoquality-bi-report.csv'

    link.click()

    URL.revokeObjectURL(url)
}