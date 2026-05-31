'use client'

import { useInventoryStore } from '@/store/inventory-store'
import { Building2 } from 'lucide-react'

export function Header() {
  const { currentBuildingId, currentStep } = useInventoryStore()
  const stepLabels = ['Cladire', 'Incaperi', 'Pereti', 'Plan', 'Export']

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-600 text-white">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Inventory DXF</h1>
            <p className="text-xs text-gray-500">
              {currentBuildingId ? `Cladire activa` : 'Nicio cladire selectata'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
            Pas {currentStep}/5: {stepLabels[currentStep - 1]}
          </span>
        </div>
      </div>
    </header>
  )
}
