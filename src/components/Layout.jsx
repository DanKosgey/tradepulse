import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function Layout() {
  return (
    <div className="flex h-screen app-bg overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6 md:p-10 space-y-2">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
