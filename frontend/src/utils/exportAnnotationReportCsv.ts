// frontend/src/utils/exportAnnotationReportCsv.ts

import type { LabelMeValidationResult } from '../api/validateApi'

export function exportAnnotationReportCsv(
    result: LabelMeValidationResult,
) {
    const rows = result.errors.map((error) => ({
        annotationIndex: error.annotationIndex,
        errorType: error.errorType,
        severity: error.severity,
        message: error.message,
        qualityScore: result.qualityScore,
    }))

    const headers = [
        'annotationIndex',
        'errorType',
        'severity',
        'message',
        'qualityScore',
    ]

    const csvContent = [
        headers.join(','),
        ...rows.map((row) =>
            headers
                .map((header) => `"${String(row[header as keyof typeof row] ?? '')}"`)
                .join(','),
        ),
    ].join('\n')

    const blob = new Blob([csvContent], {
        type: 'text/csv;charset=utf-8;',
    })

    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')

    link.href = url
    link.download = 'annotation-quality-report.csv'

    document.body.appendChild(link)

    link.click()

    document.body.removeChild(link)

    URL.revokeObjectURL(url)
}