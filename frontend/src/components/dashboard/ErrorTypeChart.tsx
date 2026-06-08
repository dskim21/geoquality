// frontend/src/components/dashboard/ErrorTypeChart.tsx

import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts'

interface ErrorTypeChartProps {
    reportRows: {
        errorType: string
    }[]
}

// 품질검사 결과를 오류 유형별로 집계
function buildChartData(
    rows: {
        errorType: string
    }[],
) {
    const errorCountMap = new Map<string, number>()

    rows.forEach((row) => {
        if (!row.errorType) return

        const count = errorCountMap.get(row.errorType) ?? 0

        errorCountMap.set(row.errorType, count + 1)
    })

    return Array.from(errorCountMap.entries()).map(
        ([errorType, count]) => ({
            errorType,
            count,
        }),
    )
}

export function ErrorTypeChart({
    reportRows,
}: ErrorTypeChartProps) {
    const data = buildChartData(reportRows)

    // 오류가 없으면 차트 표시 안 함
    if (data.length === 0) {
        return null
    }

    return (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
                <h4 className="font-semibold text-slate-900">
                    Error Type Distribution
                </h4>

                <p className="text-sm text-slate-500">
                    품질검사 결과 오류 유형별 발생 건수입니다.
                </p>
            </div>

            <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" />

                        <XAxis
                            dataKey="errorType"
                            tick={{ fontSize: 12 }}
                        />

                        <YAxis allowDecimals={false} />

                        <Tooltip />

                        <Bar
                            dataKey="count"
                            radius={[6, 6, 0, 0]}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}