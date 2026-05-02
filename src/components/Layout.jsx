import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import MobileHeader from './MobileHeader'
import MobileQuickNav from './MobileQuickNav'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen)

  return (
    <div className="flex h-screen app-bg overflow-hidden relative">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div className={`
        fixed inset-y-0 left-0 z-[70] transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar onNavClick={() => setSidebarOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Mobile Navigation Stack */}
        <div className="flex flex-col lg:hidden z-50">
          <MobileHeader onMenuClick={toggleSidebar} />
          <MobileQuickNav />
        </div>

        {/* Desktop Topbar */}
        <div className="hidden lg:block">
          <Topbar />
        </div>
        
        <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

