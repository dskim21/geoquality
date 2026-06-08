// frontend/src/router/AppRouter.tsx

import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { HomePage } from '../pages/HomePage'
import { UploadPage } from '../pages/UploadPage'
import { DatasetPage } from '../pages/DatasetPage'
import { ReportPage } from '../pages/ReportPage'

export function AppRouter() {
    return (
        <BrowserRouter>
            <Routes>
                <Route element={<AppLayout />}>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/upload" element={<UploadPage />} />
                    <Route path="/datasets/:datasetId" element={<DatasetPage />} />
                    <Route path="/reports/:datasetId" element={<ReportPage />} />
                </Route>
            </Routes>
        </BrowserRouter>
    )
}