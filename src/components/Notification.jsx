import { CheckCircle, XCircle, Info, X } from 'lucide-react'

const icons = {
  success: <CheckCircle className="w-4 h-4 text-accent" />,
  error: <XCircle className="w-4 h-4 text-danger" />,
  info: <Info className="w-4 h-4 text-cyan" />,
}

const colors = {
  success: 'border-accent/30 bg-accent/5',
  error: 'border-danger/30 bg-danger/5',
  info: 'border-cyan/30 bg-cyan/5',
}

export default function Notification({ data }) {
  return (
    <div className="fixed top-6 right-6 z-[9999] animate-slide-in">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-sm
                      shadow-2xl max-w-sm font-body text-sm text-white
                      ${colors[data.type] || colors.info}`}
           style={{ animation: 'slideIn 0.3s ease' }}>
        {icons[data.type] || icons.info}
        <span className="flex-1">{data.msg}</span>
      </div>
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}
