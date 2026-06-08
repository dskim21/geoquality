// frontend/src/pages/UploadPage.tsx

import { FileUploadCard } from '../components/upload/FileUploadCard'
import { UploadGuide } from '../components/upload/UploadGuide'

export function UploadPage() {
    return (
        <div>
            <div className="mb-8">
                <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-sky-600">
                    Upload
                </p>
                <h1 className="text-4xl font-black tracking-tight text-slate-950">
                    Upload Spatial Data
                </h1>
                <p className="mt-3 max-w-2xl text-slate-600">
                    GeoJSON 또는 CSV 좌표 데이터를 업로드하고 공간데이터 품질검사를 실행합니다.
                </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <FileUploadCard />
                <UploadGuide />
            </div>
        </div>
    )
}