'use client'

import { useInventoryStore } from '@/store/inventory-store'
import { Header } from '@/components/inventory/header'
import { StepNavigation } from '@/components/inventory/step-navigation'
import { BuildingForm } from '@/components/inventory/building-form'
import { RoomList } from '@/components/inventory/room-list'
import { FloorPlan } from '@/components/inventory/floor-plan'
import { ExportPanel } from '@/components/inventory/export-panel'

export default function Home() {
  const { currentStep } = useInventoryStore()

  function renderStep() {
    switch (currentStep) {
      case 1:
        return <BuildingForm />
      case 2:
        return <RoomList autoExpand={false} />
      case 3:
        return <RoomList autoExpand={true} />
      case 4:
        return <FloorPlan />
      case 5:
        return <ExportPanel />
      default:
        return <BuildingForm />
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 overflow-y-auto">
        {renderStep()}
      </main>
      <StepNavigation />
    </div>
  )
}
