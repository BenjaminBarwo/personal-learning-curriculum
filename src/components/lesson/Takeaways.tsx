import React from 'react'

interface TakeawaysProps {
  children: React.ReactNode
}

export function Takeaways({ children }: TakeawaysProps) {
  return (
    <div className="my-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 overflow-hidden">
      <div className="flex items-center gap-3 border-b border-emerald-500/20 px-6 py-4">
        <span
          className="shrink-0 text-emerald-400 text-lg select-none"
          aria-hidden="true"
        >
          &#x2705;
        </span>
        <h3 className="text-xs font-semibold text-emerald-300 tracking-wide uppercase">
          Key Takeaways
        </h3>
      </div>
      <div className="px-6 py-5 text-text-secondary leading-relaxed">
        {children}
      </div>
    </div>
  )
}
