// frontend/src/components/upload/UploadGuide.tsx

import { CheckCircle2 } from 'lucide-react'

// 업로드 전 사용자에게 안내할 데이터 조건과 검사 항목
const guideItems = [
    'GeoJSON은 FeatureCollection 형식을 권장합니다.',
    'CSV는 latitude, longitude 컬럼을 포함해야 합니다.',
    '업로드 후 Geometry 오류, 중복, 결측치, 좌표 범위를 검사합니다.',
    '분석 결과는 지도와 품질 리포트에서 확인할 수 있습니다.',
]

export function UploadGuide() {
    return (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">검사 항목</h2>

            <div className="mt-5 space-y-4">
                {guideItems.map((item) => (
                    <div key={item} className="flex gap-3">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-sky-500" />
                        <p className="text-sm leading-6 text-slate-600">{item}</p>
                    </div>
                ))}
            </div>
        </div>
    )
}