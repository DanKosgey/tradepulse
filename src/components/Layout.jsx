import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen)

  return (
    <div className="flex h-screen app-bg overflow-hidden relative">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div className={`
        fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar onNavClick={() => setSidebarOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden relative">
        <div className="flex items-center">
          {/* Mobile Toggle Button */}
          <button 
            onClick={toggleSidebar}
            className="lg:hidden p-4 text-emerald-500 hover:text-emerald-400 transition-colors"
          >
            <Menu size={24} />
          </button>
          <div className="flex-1">
            <Topbar />
          </div>
        </div>
        
        <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

