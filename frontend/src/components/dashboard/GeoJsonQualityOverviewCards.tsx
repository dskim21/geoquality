// frontend/src/components/dashboard/GeoJsonQualityOverviewCards.tsx

import {
    AlertTriangle,
    CheckCircle2,
    Database,
    FileDown,
    Gauge,
} from 'lucide-react'

import type { ParsedGeoJsonSummary } from '../../utils/fileParser'

interface GeoJsonQualityOverviewCardsProps {
    geoJsonSummary: ParsedGeoJsonSummary
}

export function GeoJsonQualityOverviewCards({
    geoJsonSummary,
}: GeoJsonQualityOverviewCardsProps) {
    const errorTypeCount = [
        geoJsonSummary.geometryErrors.length > 0,
        geoJsonSummary.duplicateErrors.length > 0,
        geoJsonSummary.missingValueErrors.length > 0,
    ].filter(Boolean).length

    const cards = [
        {
            label: 'Total Features',
            value: geoJsonSummary.featureCount,
            icon: Database,
        },
        {
            label: 'Valid Features',
            value: geoJsonSummary.validFeatureCount,
            icon: CheckCircle2,
        },
        {
            label: 'Invalid Features',
            value: geoJsonSummary.invalidFeatureCount,
            icon: AlertTriangle,
        },
        {
            label: 'Quality Score',
            value: geoJsonSummary.qualityScore,
            icon: Gauge,
        },
        {
            label: 'Error Types',
            value: errorTypeCount,
            icon: AlertTriangle,
        },
        {
            label: 'Export Ready',
            value: 'GeoJSON',
            icon: FileDown,
        },
    ]

    return (
        <div className="mt-5">
            <div className="mb-3">
                <h4 className="font-semibold text-slate-900">
                    Quality Overview
                </h4>

                <p className="text-sm text-slate-500">
                    GeoJSON 품질검사 결과 요약 지표입니다.
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
                            <div className="flex items-center justify-between">
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