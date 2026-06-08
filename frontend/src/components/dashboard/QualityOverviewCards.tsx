// frontend/src/components/dashboard/QualityOverviewCards.tsx

import { AlertTriangle, CheckCircle2, Database, FileDown, Gauge } from 'lucide-react'
import type { ParsedCsvSummary } from '../../utils/fileParser'

interface QualityOverviewCardsProps {
    csvSummary: ParsedCsvSummary
}

// CSV 품질검사 결과를 BI 대시보드처럼 요약 표시
export function QualityOverviewCards({ csvSummary }: QualityOverviewCardsProps) {
    const errorTypeCount = new Set(
        csvSummary.reportRows
            .map((row) => row.errorType)
            .filter((errorType) => errorType !== ''),
    ).size

    const cards = [
        {
            label: 'Total Rows',
            value: csvSummary.featureCount,
            icon: Database,
        },
        {
            label: 'Valid Rows',
            value: csvSummary.validFeatureCount,
            icon: CheckCircle2,
        },
        {
            label: 'Invalid Rows',
            value: csvSummary.invalidFeatureCount,
            icon: AlertTriangle,
        },
        {
            label: 'Quality Score',
            value: `${csvSummary.qualityScore}`,
            icon: Gauge,
        },
        {
            label: 'Error Types',
            value: errorTypeCount,
            icon: AlertTriangle,
        },
        {
            label: 'Export Ready',
            value: 'BI CSV',
            icon: FileDown,
        },
    ]

    return (
        <div className="mt-5">
            <div className="mb-3">
                <h4 className="font-semibold text-slate-900">Quality Overview</h4>
                <p className="text-sm text-slate-500">
                    Tableau / Power BI 연계를 위한 품질검사 요약 지표입니다.
                </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {cards.map((card) => {
                    const Icon = card.icon

                    return (
                        <div
                            key={card.label}
                            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                        >
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                        {card.label}
                                    </p>
                                    <p className="mt-2 text-2xl font-black text-slate-950">
                                        {card.value}
                                    </p>
                                </div>

                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                                    <Icon className="h-5 w-5" />
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}