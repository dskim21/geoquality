// frontend/src/components/layout/AppLayout.tsx

import { NavLink, Outlet } from 'react-router-dom'
import { Database, Home, Upload } from 'lucide-react'

const navItems = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/upload', label: 'Upload', icon: Upload },
]

export function AppLayout() {
    return (
        <div className="min-h-screen bg-slate-50 text-slate-950">
            {/* 상단 네비게이션 */}
            <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                    <NavLink to="/" className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500 text-white">
                            <Database className="h-5 w-5" />
                        </div>
                        <span className="text-xl font-black tracking-tight">GeoQuality</span>
                    </NavLink>

                    <nav className="flex items-center gap-2">
                        {navItems.map((item) => {
                            const Icon = item.icon

                            return (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    className={({ isActive }) =>
                                        [
                                            'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition',
                                            isActive
                                                ? 'bg-sky-500 text-white shadow-sm'
                                                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950',
                                        ].join(' ')
                                    }
                                >
                                    <Icon className="h-4 w-4" />
                                    {item.label}
                                </NavLink>
                            )
                        })}
                    </nav>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-6 py-8">
                <Outlet />
            </main>
        </div>
    )
}