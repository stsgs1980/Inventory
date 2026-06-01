'use client'

import { COMPASS_GRID } from '@/lib/constants'

interface CompassSelectorProps {
  value: string
  onChange: (direction: string) => void
}

export function CompassSelector({ value, onChange }: CompassSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-1 w-fit mx-auto">
      {COMPASS_GRID.flat().map((dir, index) => {
        if (dir === '') {
          // Center cell - show current direction or dot
          return (
            <div
              key={`center-${index}`}
              className="w-12 h-12 flex items-center justify-center rounded bg-gray-50 border border-gray-200"
            >
              {value ? (
                <span className="text-xs font-bold text-emerald-600">{value}</span>
              ) : (
                <span className="text-gray-300 text-lg">.</span>
              )}
            </div>
          )
        }
        const isActive = value === dir
        return (
          <button
            key={dir}
            type="button"
            onClick={() => onChange(dir)}
            className={`w-12 h-12 flex items-center justify-center rounded text-sm font-bold transition-all min-h-[44px] min-w-[44px] ${
              isActive
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 border border-gray-200'
            }`}
          >
            {dir}
          </button>
        )
      })}
    </div>
  )
}
