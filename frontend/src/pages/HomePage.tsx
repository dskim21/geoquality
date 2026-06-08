// frontend/src/pages/HomePage.tsx

import { ArrowRight, BarChart3, Database, Map, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

const stats = [
    { label: 'Quality Checks', value: '6+' },
    { label: 'Spatial Analysis', value: '3' },
    { label: 'ML Detection', value: '1' },
]

export function HomePage() {
    return (
        <section className="min-h-[76vh]">
            {/* Hero 영역 */}
            <div className="grid items-center gap-12 py-12 lg:grid-cols-[1.1fr_0.9fr]">
                <div>
                    <p className="mb-5 inline-flex rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700">
                        GIS Data Quality Management Platform
                    </p>

                    <h1 className="max-w-4xl text-5xl font-black leading-tight tracking-tight text-slate-950 md:text-7xl">
                        Spatial data quality,
                        <span className="block text-sky-600">made visible.</span>
                    </h1>

                    <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                        GeoQuality는 공간데이터의 Geometry 오류, 중복 객체, 좌표 이상치,
                        결측치와 ML 기반 이상치를 자동 분석하고 지도와 리포트로 시각화하는
                        GIS 품질관리 플랫폼입니다.
                    </p>

                    <div className="mt-8 flex flex-wrap gap-3">
                        <Link
                            to="/upload"
                            className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-5 py-3 font-bold text-white shadow-sm transition hover:bg-sky-600"
                        >
                            데이터 업로드 시작
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>

                    <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
                        {stats.map((item) => (
                            <div
                                key={item.label}
                                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                            >
                                <p className="text-2xl font-black text-slate-950">{item.value}</p>
                                <p className="mt-1 text-xs font-medium text-slate-500">
                                    {item.label}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 오른쪽 대시보드 프리뷰 카드 */}
                <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60">
                    <div className="mb-5 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-bold text-slate-950">Dataset Quality</p>
                            <p className="text-xs text-slate-500">seoul-parks-sample.geojson</p>
                        </div>
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                            92 Score
                        </span>
                    </div>

                    <div className="grid gap-3">
                        <PreviewCard
                            icon={<ShieldCheck className="h-5 w-5" />}
                            title="Rule-based Checks"
                            description="Geometry validity, duplicate features, missing values."
                        />
                        <PreviewCard
                            icon={<BarChart3 className="h-5 w-5" />}
                            title="Spatial Analytics"
                            description="Density, clustering, and coordinate range analysis."
                        />
                        <PreviewCard
                            icon={<Map className="h-5 w-5" />}
                            title="Map Review"
                            description="Review detected issues directly on the spatial preview map."
                        />
                    </div>
                </div>
            </div>
        </section>
    )
}

function PreviewCard({
    icon,
    title,
    description,
}: {
    icon: React.ReactNode
    title: string
    description: string
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
                {icon}
            </div>
            <h3 className="font-bold text-slate-950">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
        </div>
    )
}