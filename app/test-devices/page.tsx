"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DeviceSelectionModal } from "@/components/device-selection-modal"

export default function TestDevicesPage() {
  const [showModal, setShowModal] = useState(false)

  const handleDevicesSelected = (videoDeviceId: string | null, audioDeviceId: string | null) => {
    console.log("Devices selected:", { videoDeviceId, audioDeviceId })
    alert(`Video: ${videoDeviceId}, Audio: ${audioDeviceId}`)
    setShowModal(false)
  }

  const handlePermissionDenied = () => {
    console.log("Permission denied")
    alert("Permission denied")
    setShowModal(false)
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Device Selection Test</h1>
      <p className="mb-4">This page tests the device selection modal independently.</p>
      
      <Button onClick={() => setShowModal(true)}>
        Open Device Selection Modal
      </Button>

      <DeviceSelectionModal
        open={showModal}
        onOpenChange={setShowModal}
        onDevicesSelected={handleDevicesSelected}
        onPermissionDenied={handlePermissionDenied}
      />
    </div>
  )
}
