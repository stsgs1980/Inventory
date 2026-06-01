'use client'

import { useInventoryStore } from '@/store/inventory-store'
import { STEP_LABELS } from '@/lib/constants'
import { Building2, LayoutGrid, PenTool, Map, Download } from 'lucide-react'

const stepIcons = [Building2, LayoutGrid, PenTool, Map, Download]

export function StepNavigation() {
  const { currentStep, setStep } = useInventoryStore()

  return (
    <nav className="sticky bottom-0 z-50 bg-white border-t border-gray-200 shadow-lg">
      <div className="flex justify-around items-center px-2 py-1">
        {STEP_LABELS.map((label, index) => {
          const step = index + 1
          const isActive = currentStep === step
          const Icon = stepIcons[index]
          return (
            <button
              key={step}
              onClick={() => setStep(step)}
              className={`flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-all min-w-[64px] min-h-[48px] ${
                isActive
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-600' : ''}`} />
              <span className={`text-[10px] mt-1 font-medium ${isActive ? 'text-emerald-700' : ''}`}>
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
