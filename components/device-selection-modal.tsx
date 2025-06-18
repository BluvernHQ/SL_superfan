"use client"

import React from "react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Camera, Mic, AlertCircle, RefreshCw } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface MediaDeviceInfo {
  deviceId: string
  label: string
  kind: MediaDeviceKind
}

interface DeviceSelectionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDevicesSelected: (videoDeviceId: string | null, audioDeviceId: string | null) => void
  onPermissionDenied: () => void
}

export function DeviceSelectionModal({
  open,
  onOpenChange,
  onDevicesSelected,
  onPermissionDenied,
}: DeviceSelectionModalProps) {
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([])
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>("")
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [permissionGranted, setPermissionGranted] = useState(false)
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null)
  const previewVideoRef = React.useRef<HTMLVideoElement>(null)

  // Request permissions and enumerate devices
  const requestPermissionsAndEnumerateDevices = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // First, enumerate devices without permissions to check availability
      const initialDevices = await navigator.mediaDevices.enumerateDevices()
      const hasVideoInput = initialDevices.some((device) => device.kind === "videoinput")
      const hasAudioInput = initialDevices.some((device) => device.kind === "audioinput")

      if (!hasVideoInput && !hasAudioInput) {
        throw new Error("No camera or microphone devices found")
      }

      // Request permissions with more flexible constraints
      const constraints: MediaStreamConstraints = {}

      if (hasVideoInput) {
        constraints.video = true
      }

      if (hasAudioInput) {
        constraints.audio = true
      }

      // If no devices available, show error
      if (!constraints.video && !constraints.audio) {
        throw new Error("No media devices available")
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)

      // Stop the stream immediately as we just needed it for permissions
      stream.getTracks().forEach((track) => track.stop())

      setPermissionGranted(true)

      // Now enumerate devices with labels
      const devices = await navigator.mediaDevices.enumerateDevices()

      const videoInputs = devices
        .filter((device) => device.kind === "videoinput")
        .map((device, index) => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${index + 1}`,
          kind: device.kind,
        }))

      const audioInputs = devices
        .filter((device) => device.kind === "audioinput")
        .map((device, index) => ({
          deviceId: device.deviceId,
          label: device.label || `Microphone ${index + 1}`,
          kind: device.kind,
        }))

      setVideoDevices(videoInputs)
      setAudioDevices(audioInputs)

      // Auto-select the first available devices
      if (videoInputs.length > 0 && !selectedVideoDevice) {
        setSelectedVideoDevice(videoInputs[0].deviceId)
      }
      if (audioInputs.length > 0 && !selectedAudioDevice) {
        setSelectedAudioDevice(audioInputs[0].deviceId)
      }
    } catch (error: any) {
      console.error("Error requesting permissions or enumerating devices:", error)

      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        setError(
          "Camera and microphone permissions are required to start streaming. Please allow access and try again.",
        )
        onPermissionDenied()
      } else if (error.name === "NotFoundError" || error.message.includes("not found")) {
        setError("No camera or microphone found. Please connect a device and try again.")
      } else if (error.name === "NotReadableError") {
        setError(
          "Camera or microphone is already in use by another application. Please close other applications and try again.",
        )
      } else if (error.name === "OverconstrainedError") {
        setError("Unable to access media devices with current settings. Please try again.")
      } else {
        setError(
          `Failed to access media devices: ${error.message || "Unknown error"}. Please check your browser settings and try again.`,
        )
      }
      setPermissionGranted(false)
    } finally {
      setIsLoading(false)
    }
  }

  // Update preview when video device changes
  const updatePreview = async (videoDeviceId: string) => {
    if (!videoDeviceId) return

    try {
      // Stop existing preview stream
      if (previewStream) {
        previewStream.getTracks().forEach((track) => track.stop())
      }

      // Create constraints for the selected device
      const constraints: MediaStreamConstraints = {
        video: videoDeviceId === "default" ? true : { deviceId: { ideal: videoDeviceId } }, // Use 'ideal' instead of 'exact'
        audio: false, // No audio for preview
      }

      // Create new preview stream with selected device
      const stream = await navigator.mediaDevices.getUserMedia(constraints)

      setPreviewStream(stream)

      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = stream
      }
    } catch (error: any) {
      console.error("Error updating preview:", error)

      // Try with default device if specific device fails
      if (videoDeviceId !== "default") {
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          })

          setPreviewStream(fallbackStream)

          if (previewVideoRef.current) {
            previewVideoRef.current.srcObject = fallbackStream
          }

          setError("Selected camera not available, using default camera.")
        } catch (fallbackError) {
          setError("Failed to preview camera. Please try a different device.")
        }
      } else {
        setError("Failed to preview selected camera. Please try a different device.")
      }
    }
  }

  // Handle video device selection
  const handleVideoDeviceChange = (deviceId: string) => {
    setSelectedVideoDevice(deviceId)
    updatePreview(deviceId)
  }

  // Initialize when modal opens
  useEffect(() => {
    if (open) {
      requestPermissionsAndEnumerateDevices()
    } else {
      // Clean up preview stream when modal closes
      if (previewStream) {
        previewStream.getTracks().forEach((track) => track.stop())
        setPreviewStream(null)
      }
    }

    return () => {
      if (previewStream) {
        previewStream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [open])

  // Update preview when video device is selected
  useEffect(() => {
    if (selectedVideoDevice && permissionGranted) {
      updatePreview(selectedVideoDevice)
    }
  }, [selectedVideoDevice, permissionGranted])

  const handleConfirm = () => {
    // Stop preview stream
    if (previewStream) {
      previewStream.getTracks().forEach((track) => track.stop())
      setPreviewStream(null)
    }

    onDevicesSelected(selectedVideoDevice || null, selectedAudioDevice || null)
    onOpenChange(false)
  }

  const handleRefresh = () => {
    requestPermissionsAndEnumerateDevices()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]" hideCloseButton={true}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Select Camera and Microphone
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
                <span>Requesting permissions and detecting devices...</span>
              </div>
            </div>
          ) : permissionGranted ? (
            <>
              {/* Camera Preview */}
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    <Label className="text-base font-medium">Camera Preview</Label>
                    <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: "16/9" }}>
                      <video ref={previewVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                      {!previewStream && (
                        <div className="absolute inset-0 flex items-center justify-center text-white">
                          <div className="text-center">
                            <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>Select a camera to see preview</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Device Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Video Device Selection */}
                <div className="space-y-2">
                  <Label htmlFor="video-device" className="flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    Camera
                  </Label>
                  <Select value={selectedVideoDevice} onValueChange={handleVideoDeviceChange}>
                    <SelectTrigger id="video-device">
                      <SelectValue placeholder="Select a camera" />
                    </SelectTrigger>
                    <SelectContent>
                      {videoDevices.length > 0 ? (
                        videoDevices.map((device) => (
                          <SelectItem key={device.deviceId} value={device.deviceId}>
                            {device.label}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>
                          No cameras found
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{videoDevices.length} camera(s) detected</p>
                </div>

                {/* Audio Device Selection */}
                <div className="space-y-2">
                  <Label htmlFor="audio-device" className="flex items-center gap-2">
                    <Mic className="h-4 w-4" />
                    Microphone
                  </Label>
                  <Select value={selectedAudioDevice} onValueChange={setSelectedAudioDevice}>
                    <SelectTrigger id="audio-device">
                      <SelectValue placeholder="Select a microphone" />
                    </SelectTrigger>
                    <SelectContent>
                      {audioDevices.length > 0 ? (
                        audioDevices.map((device) => (
                          <SelectItem key={device.deviceId} value={device.deviceId}>
                            {device.label}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>
                          No microphones found
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{audioDevices.length} microphone(s) detected</p>
                </div>
              </div>

              {/* Refresh Button */}
              <div className="flex justify-center">
                <Button variant="outline" onClick={handleRefresh} className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Refresh Devices
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">Permissions Required</p>
              <p className="text-muted-foreground mb-4">
                We need access to your camera and microphone to start streaming.
              </p>
              <Button
                onClick={requestPermissionsAndEnumerateDevices}
                className="bg-gradient-to-r from-orange-600 to-orange-500"
              >
                Grant Permissions
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!permissionGranted || !selectedVideoDevice || !selectedAudioDevice}
            className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600"
          >
            Continue with Selected Devices
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
