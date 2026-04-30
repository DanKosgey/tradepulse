import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Monitor, 
  Cloud, 
  Puzzle, 
  Zap, 
  X, 
  Upload, 
  History as HistoryIcon,
  Search,
  ExternalLink,
  Plus,
  ArrowRight
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

// Mock data for recent bots
const RECENT_BOTS = []

export default function LoadBot() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('local')
  const navigate = useNavigate()

  const handleOptionClick = (option) => {
    if (option === 'computer') {
      setIsModalOpen(true)
      setActiveTab('local')
    } else if (option === 'drive') {
      setIsModalOpen(true)
      setActiveTab('drive')
    } else if (option === 'builder') {
      navigate('/app/bot')
    } else if (option === 'strategy') {
      // Logic for quick strategy
      setIsModalOpen(true)
      setActiveTab('recent')
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  }

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: 'spring', stiffness: 100, damping: 15 }
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[75vh] text-center px-6 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[120px] pointer-events-none" />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 mb-16"
      >
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 heading-formal tracking-tighter">
          Load or build your bot
        </h1>
        <p className="text-text-muted max-w-2xl mx-auto text-lg md:text-xl font-light leading-relaxed">
          The ultimate automated trading experience. Import your strategies from your device, 
          Google Drive, or design new ones from scratch.
        </p>
      </motion.div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 w-full max-w-6xl relative z-10"
      >
        <OptionCard 
          icon={Monitor} 
          label="My computer" 
          description="Load XML or JSON files"
          onClick={() => handleOptionClick('computer')}
          variants={itemVariants}
        />
        <OptionCard 
          icon={Cloud} 
          label="Google Drive" 
          description="Sync your cloud strategies"
          onClick={() => handleOptionClick('drive')}
          variants={itemVariants}
          isGoogle
        />
        <OptionCard 
          icon={Puzzle} 
          label="Bot builder" 
          description="Visual block configuration"
          onClick={() => handleOptionClick('builder')}
          variants={itemVariants}
          accentColor="#00d4ff"
        />
        <OptionCard 
          icon={Zap} 
          label="Quick strategy" 
          description="Launch proven templates"
          onClick={() => handleOptionClick('strategy')}
          variants={itemVariants}
          accentColor="#ffb800"
        />
      </motion.div>

      {/* Modal Backdrop */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-xl"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="relative w-full max-w-3xl bg-[#060c07] border border-white/10 rounded-[32px] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)]"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-10 py-8 border-b border-white/5 bg-white/[0.02]">
                <div>
                   <h2 className="text-2xl font-bold text-white heading-formal tracking-wide">Load strategy</h2>
                   <p className="text-text-muted text-sm mt-1">Select your preferred import method</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-2xl transition-all group"
                >
                  <X className="w-6 h-6 text-text-muted group-hover:text-white group-hover:rotate-90 transition-all duration-300" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex px-10 py-6 gap-3 bg-black/40 overflow-x-auto no-scrollbar">
                <TabButton 
                  active={activeTab === 'recent'} 
                  onClick={() => setActiveTab('recent')}
                  label="Recent"
                  icon={HistoryIcon}
                />
                <TabButton 
                  active={activeTab === 'local'} 
                  onClick={() => setActiveTab('local')}
                  label="Local"
                  icon={Monitor}
                />
                <TabButton 
                  active={activeTab === 'drive'} 
                  onClick={() => setActiveTab('drive')}
                  label="Google Drive"
                  icon={Cloud}
                />
              </div>

              {/* Modal Content */}
              <div className="p-10 min-h-[450px] flex flex-col items-center justify-center bg-gradient-to-b from-transparent to-accent/[0.02]">
                {activeTab === 'recent' && <RecentTab />}
                {activeTab === 'local' && <LocalTab />}
                {activeTab === 'drive' && <DriveTab />}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

function OptionCard({ icon: Icon, label, description, onClick, variants, isGoogle, accentColor = '#00ff87' }) {
  return (
    <motion.div
      variants={variants}
      whileHover={{ y: -10, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="group relative p-1 cursor-pointer"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-[32px] opacity-50 group-hover:opacity-100 transition-opacity" />
      <div className="relative bg-[#0a140c]/90 backdrop-blur-md rounded-[31px] p-10 flex flex-col items-center justify-center gap-6 border border-white/5 group-hover:border-white/20 transition-all h-full shadow-2xl">
        <div 
          className="w-24 h-24 rounded-3xl flex items-center justify-center transition-all duration-500 shadow-lg group-hover:shadow-2xl border border-white/5 relative overflow-hidden"
          style={{ 
            backgroundColor: `${accentColor}10`,
            color: accentColor,
            boxShadow: `0 0 40px ${accentColor}10`
          }}
        >
          {/* Subtle internal glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          
          {isGoogle ? (
             <svg className="w-12 h-12 z-10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.51 14.85l3.99 6.89h-8l-3.99-6.89zM19.17 13.15l3.99-6.89h-8l-3.99 6.89zM12 2.26l-3.99 6.89 3.99 6.89 3.99-6.89z" fill="#FFC107"/>
                <path d="M12 2.26L15.99 9.15 8.01 9.15z" fill="#FFC107"/>
                <path d="M8.01 9.15L4.02 15.15 0 9.15z" fill="#2196F3"/>
                <path d="M15.99 9.15L19.98 15.15 24 9.15z" fill="#4CAF50"/>
             </svg>
          ) : (
            <Icon className="w-12 h-12 z-10" strokeWidth={1.2} />
          )}
        </div>
        <div>
          <h3 className="text-white font-bold text-xl tracking-wide group-hover:text-accent transition-colors">
            {label}
          </h3>
          <p className="text-text-muted text-xs font-mono mt-2 opacity-60 group-hover:opacity-100 transition-opacity uppercase tracking-widest">
            {description}
          </p>
        </div>
        
        <div className="mt-2 w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-accent group-hover:text-black transition-all duration-300 opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0">
          <ArrowRight className="w-5 h-5" />
        </div>
      </div>
    </motion.div>
  )
}

function TabButton({ active, onClick, label, icon: Icon }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-8 py-3.5 rounded-2xl text-xs font-mono tracking-widest uppercase transition-all shrink-0
        ${active 
          ? 'bg-accent text-black font-black shadow-[0_0_30px_rgba(0,255,135,0.3)]' 
          : 'text-white/30 hover:text-white/60 hover:bg-white/5 border border-transparent hover:border-white/10'}`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  )
}

function RecentTab() {
  return (
    <div className="flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="w-32 h-32 rounded-[40px] bg-white/[0.03] border border-white/5 flex items-center justify-center mb-10 relative">
        <div className="absolute inset-0 bg-accent/5 blur-2xl rounded-full" />
        <Search className="w-12 h-12 text-white/10 relative z-10" strokeWidth={1} />
      </div>
      <h3 className="text-2xl font-bold text-white mb-3 heading-formal">No recent bots found</h3>
      <p className="text-white/30 max-w-sm text-sm leading-relaxed">
        Start building your legacy. Create a new bot or import an existing configuration to get started.
      </p>
      <button className="mt-10 px-6 py-2 rounded-full border border-accent/20 text-accent hover:bg-accent/10 transition-all text-[10px] font-mono tracking-[0.2em] uppercase">
        Help Center & FAQ
      </button>
    </div>
  )
}

function LocalTab() {
  return (
    <div className="w-full flex flex-col items-center animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="w-full max-w-lg p-5 bg-accent/5 border border-accent/10 rounded-2xl mb-10 flex items-center gap-5">
        <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0 border border-accent/20 shadow-inner">
          <Info className="w-5 h-5 text-accent" />
        </div>
        <p className="text-[11px] text-accent/80 font-mono leading-relaxed">
          Phoenix supports native XML/JSON exports and legacy Binary Bot formats. 
          Third-party strategy conversion may take a few seconds.
        </p>
      </div>

      <div className="w-full border-2 border-dashed border-white/5 rounded-[40px] p-16 flex flex-col items-center justify-center transition-all hover:border-accent/30 hover:bg-white/[0.01] group cursor-pointer relative overflow-hidden">
        {/* Subtle hover pulse */}
        <div className="absolute inset-0 bg-accent/0 group-hover:bg-accent/[0.02] transition-colors" />
        
        <div className="w-28 h-28 rounded-[36px] bg-white/[0.03] border border-white/5 flex items-center justify-center mb-10 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 relative z-10 shadow-2xl">
           <Monitor className="w-14 h-14 text-white/10 group-hover:text-accent/40 transition-colors" strokeWidth={1} />
        </div>
        
        <h3 className="text-2xl font-bold text-white mb-2 relative z-10 heading-formal">Drop your file here</h3>
        <p className="text-white/20 text-sm mb-12 relative z-10 font-mono tracking-widest uppercase">or browse files</p>
        
        <label className="btn-primary cursor-pointer relative z-10 !px-12 !py-4 !rounded-2xl">
          <Upload className="w-4 h-4" />
          Choose Strategy File
          <input type="file" className="hidden" accept=".xml,.json" />
        </label>
      </div>
    </div>
  )
}

function DriveTab() {
  return (
    <div className="flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-8 duration-700">
       <div className="w-40 h-40 mb-10 relative">
         <div className="absolute inset-0 bg-accent/10 blur-[60px] rounded-full animate-pulse" />
         <svg className="w-full h-full relative z-10 drop-shadow-[0_0_30px_rgba(66,133,244,0.2)]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.51 14.85l3.99 6.89h-8l-3.99-6.89zM19.17 13.15l3.99-6.89h-8l-3.99 6.89zM12 2.26l-3.99 6.89 3.99 6.89 3.99-6.89z" fill="#FFC107"/>
            <path d="M12 2.26L15.99 9.15 8.01 9.15z" fill="#FFC107"/>
            <path d="M8.01 9.15L4.02 15.15 0 9.15z" fill="#2196F3"/>
            <path d="M15.99 9.15L19.98 15.15 24 9.15z" fill="#4CAF50"/>
         </svg>
       </div>
       <h2 className="text-3xl font-bold text-white mb-4 heading-formal">Cloud Strategy Sync</h2>
       <p className="text-white/30 max-w-md mb-12 text-sm leading-relaxed font-light">
         Connect your Google Drive to seamlessly sync bot configurations across all your devices. 
         Security and privacy are our top priority.
       </p>
       <button className="btn-primary !px-16 !py-4 !rounded-2xl flex items-center gap-3">
         <ExternalLink className="w-4 h-4" />
         Authorize Access
       </button>
       <p className="mt-8 text-[10px] text-white/10 font-mono tracking-widest uppercase">
         Powered by Google OAuth 2.0
       </p>
    </div>
  )
}

function Info(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  )
}
