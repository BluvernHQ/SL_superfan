"use client"

import React from "react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Camera, Mic, AlertCircle, RefreshCw, Shield, Globe } from "lucide-react"
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
  const [needsPermissionPrompt, setNeedsPermissionPrompt] = useState(false)
  const previewVideoRef = React.useRef<HTMLVideoElement>(null)

  // Check if we're on HTTPS or localhost
  const isSecureContext = () => {
    if (typeof window === 'undefined') return false
    return window.location.protocol === 'https:' || 
           window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1' ||
           window.location.hostname === '::1'
  }

  // Advanced device detection that works across all OS and conditions
  const advancedDeviceDetection = async () => {
    console.log("=== ADVANCED DEVICE DETECTION ===")
    console.log("OS:", navigator.platform)
    console.log("User Agent:", navigator.userAgent)
    console.log("Location:", window.location.href)
    console.log("Secure Context:", isSecureContext())

    // Try multiple approaches to detect devices
    const detectionMethods = []

    // Method 1: Standard MediaDevices API
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      try {
        console.log("🔍 Method 1: Standard MediaDevices API")
        const devices = await navigator.mediaDevices.enumerateDevices()
        console.log("Standard API devices:", devices)
        detectionMethods.push({
          method: "Standard MediaDevices",
          devices: devices,
          success: true
        })
      } catch (error: any) {
        console.log("Standard API failed:", error)
        detectionMethods.push({
          method: "Standard MediaDevices",
          error: error.message,
          success: false
        })
      }
    }

    // Method 2: Legacy getUserMedia detection
    console.log("🔍 Method 2: Legacy getUserMedia detection")
    const legacyGetUserMedia = (navigator as any).getUserMedia ||
                              (navigator as any).webkitGetUserMedia ||
                              (navigator as any).mozGetUserMedia ||
                              (navigator as any).msGetUserMedia

    if (legacyGetUserMedia) {
      detectionMethods.push({
        method: "Legacy getUserMedia",
        available: true,
        success: true
      })
    }

    // Method 3: Check for common device patterns in navigator
    console.log("🔍 Method 3: Navigator device hints")
    const navigatorHints = {
      hasMediaDevices: !!navigator.mediaDevices,
      hasGetUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      hasEnumerateDevices: !!(navigator.mediaDevices && navigator.mediaDevices.enumerateDevices),
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine
    }
    
    detectionMethods.push({
      method: "Navigator Analysis",
      hints: navigatorHints,
      success: true
    })

    return detectionMethods
  }

  // Enhanced permission request with multiple fallback strategies
  const requestPermissionsAndEnumerateDevices = async () => {
    console.log("=== ENHANCED PERMISSION REQUEST ===")
    setIsLoading(true)
    setError(null)
    setNeedsPermissionPrompt(false)

    try {
      // First, run advanced device detection
      const detectionResults = await advancedDeviceDetection()
      console.log("Detection results:", detectionResults)

      // Strategy 1: Try direct permission request (works on HTTPS)
      if (isSecureContext()) {
        console.log("🚀 Strategy 1: Direct permission request (HTTPS)")
        setNeedsPermissionPrompt(true)

        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
          })
          
          console.log("✅ Direct permission successful:", stream)
          
          // Process the stream
          stream.getTracks().forEach((track) => {
            console.log(`Track: ${track.kind} - ${track.label}`)
            track.stop()
          })

          setPermissionGranted(true)
          setNeedsPermissionPrompt(false)

          // Enumerate devices with labels
          const devices = await navigator.mediaDevices.enumerateDevices()
          await processDevices(devices)
          return

        } catch (directError) {
          console.log("Direct permission failed:", directError)
          // Continue to fallback strategies
        }
      }

      // Strategy 2: Try without audio first (some systems have audio issues)
      console.log("🚀 Strategy 2: Video-only permission request")
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        })
        
        console.log("✅ Video-only permission successful:", videoStream)
        videoStream.getTracks().forEach(track => track.stop())

        // Now try to add audio
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: true
          })
          console.log("✅ Audio permission also successful")
          audioStream.getTracks().forEach(track => track.stop())
        } catch (audioError) {
          console.log("Audio permission failed, continuing with video only:", audioError)
        }

        setPermissionGranted(true)
        setNeedsPermissionPrompt(false)

        // Enumerate devices
        const devices = await navigator.mediaDevices.enumerateDevices()
        await processDevices(devices)
        return

      } catch (videoError) {
        console.log("Video-only permission failed:", videoError)
      }

      // Strategy 3: Try with specific constraints for different OS
      console.log("🚀 Strategy 3: OS-specific constraints")
      const osConstraints = getOSSpecificConstraints()
      
      for (const constraint of osConstraints) {
        try {
          console.log(`Trying constraint:`, constraint)
          const stream = await navigator.mediaDevices.getUserMedia(constraint)
          console.log("✅ OS-specific constraint successful:", stream)
          
          stream.getTracks().forEach(track => track.stop())
          setPermissionGranted(true)
          setNeedsPermissionPrompt(false)

          const devices = await navigator.mediaDevices.enumerateDevices()
          await processDevices(devices)
          return

        } catch (constraintError) {
          console.log(`Constraint failed:`, constraintError)
          continue
        }
      }

      // Strategy 4: Enumerate devices without permissions (limited info)
      console.log("🚀 Strategy 4: Device enumeration without permissions")
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        console.log("Devices without permissions:", devices)
        
        if (devices.length > 0) {
          await processDevices(devices, false) // false = no permissions granted
          
          // Show a message that permissions are needed for full functionality
          setError("Devices detected but permissions needed. Please grant camera and microphone access for full functionality.")
          return
        }
      } catch (enumError) {
        console.log("Device enumeration failed:", enumError)
      }

      // If all strategies fail, provide comprehensive error
      throw new Error("Unable to access camera and microphone")

    } catch (error: any) {
      console.error("❌ All strategies failed:", error)
      setNeedsPermissionPrompt(false)
      handlePermissionError(error)
    } finally {
      setIsLoading(false)
    }
  }

  // Get OS-specific constraints
  const getOSSpecificConstraints = () => {
    const userAgent = navigator.userAgent.toLowerCase()
    const platform = navigator.platform.toLowerCase()
    
    const constraints = []

    // Basic constraint
    constraints.push({ video: true, audio: true })

    // Windows-specific
    if (platform.includes('win')) {
      constraints.push({
        video: { width: 640, height: 480 },
        audio: { echoCancellation: true, noiseSuppression: true }
      })
    }

    // macOS-specific
    if (platform.includes('mac')) {
      constraints.push({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: { echoCancellation: true, autoGainControl: true }
      })
    }

    // Linux-specific
    if (platform.includes('linux')) {
      constraints.push({
        video: { width: { min: 320 }, height: { min: 240 } },
        audio: { sampleRate: 44100 }
      })
    }

    // Mobile-specific
    if (/android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)) {
      constraints.push({
        video: { facingMode: 'user', width: { max: 640 }, height: { max: 480 } },
        audio: { echoCancellation: true }
      })
    }

    // Fallback constraints
    constraints.push({ video: { width: 320, height: 240 }, audio: false })
    constraints.push({ video: true, audio: false })
    constraints.push({ video: false, audio: true })

    return constraints
  }

  // Process detected devices
  const processDevices = async (devices: MediaDeviceInfo[], hasPermissions = true) => {
    console.log("Processing devices:", devices)

    const videoInputs = devices
      .filter((device) => device.kind === "videoinput")
      .map((device, index) => ({
        deviceId: device.deviceId,
        label: device.label || (hasPermissions ? `Camera ${index + 1}` : `Camera Device ${index + 1}`),
        kind: device.kind,
      }))

    const audioInputs = devices
      .filter((device) => device.kind === "audioinput")
      .map((device, index) => ({
        deviceId: device.deviceId,
        label: device.label || (hasPermissions ? `Microphone ${index + 1}` : `Microphone Device ${index + 1}`),
        kind: device.kind,
      }))

    console.log("📹 Processed video devices:", videoInputs)
    console.log("🎤 Processed audio devices:", audioInputs)

    setVideoDevices(videoInputs)
    setAudioDevices(audioInputs)

    // Auto-select the first available devices
    if (videoInputs.length > 0 && !selectedVideoDevice) {
      setSelectedVideoDevice(videoInputs[0].deviceId)
    }
    if (audioInputs.length > 0 && !selectedAudioDevice) {
      setSelectedAudioDevice(audioInputs[0].deviceId)
    }

    if (hasPermissions) {
      setPermissionGranted(true)
    }

    console.log("✅ Device processing completed")
  }

  // Enhanced error handling
  const handlePermissionError = (error: any) => {
    let errorMessage = error.message
    let showBrowserHelp = false

    if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
      errorMessage = "Camera and microphone permissions were denied. Please click 'Allow' when your browser asks for permission, then try again."
      showBrowserHelp = true
      onPermissionDenied()
    } else if (error.name === "NotFoundError") {
      errorMessage = "No camera or microphone found. Please connect a device and try again."
    } else if (error.name === "NotReadableError") {
      errorMessage = "Camera or microphone is already in use by another application. Please close other applications and try again."
    } else if (error.name === "OverconstrainedError") {
      errorMessage = "Unable to access media devices with current settings. Please try again."
    } else if (error.name === "SecurityError") {
      if (!isSecureContext()) {
        errorMessage = "Camera and microphone access requires HTTPS. Please access this page over a secure connection (https://) or use localhost for testing."
      } else {
        errorMessage = "Security error accessing media devices. Please check your browser settings."
      }
      showBrowserHelp = true
    } else if (error.name === "TypeError" && error.message.includes("mediaDevices")) {
      errorMessage = "Your browser doesn't support camera and microphone access. Please use a modern browser like Chrome, Firefox, Safari, or Edge."
    } else if (error.message.includes("not supported") || error.message.includes("not available")) {
      errorMessage = "Media devices are not supported in this browser. Please use Chrome, Firefox, Safari, or Edge."
    } else {
      if (!isSecureContext()) {
        errorMessage = "Camera access failed. This might be because you're not using HTTPS. Please access this page over a secure connection (https://) or use localhost for testing."
        showBrowserHelp = true
      } else {
        errorMessage = `Failed to access camera and microphone: ${error.message}. Please check your browser settings and try again.`
        showBrowserHelp = true
      }
    }

    setError(errorMessage)
    setPermissionGranted(false)

    if (showBrowserHelp) {
      setError(errorMessage + " Click 'Get Help' below for assistance.")
    }
  }

  // Update preview when video device changes
  const updatePreview = async (videoDeviceId: string) => {
    if (!videoDeviceId || !navigator.mediaDevices) return

    try {
      // Stop existing preview stream
      if (previewStream) {
        previewStream.getTracks().forEach((track) => track.stop())
      }

      // Create constraints for the selected device
      const constraints: MediaStreamConstraints = {
        video: { deviceId: { ideal: videoDeviceId } },
        audio: false, // No audio for preview
      }

      console.log("🎥 Creating preview for device:", videoDeviceId)
      const stream = await navigator.mediaDevices.getUserMedia(constraints)

      setPreviewStream(stream)

      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = stream
      }
    } catch (error: any) {
      console.error("Error updating preview:", error)

      // Try with default device if specific device fails
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
    }
  }

  // Handle video device selection
  const handleVideoDeviceChange = (deviceId: string) => {
    setSelectedVideoDevice(deviceId)
    updatePreview(deviceId)
  }

  // Initialize when modal opens - be proactive like Google Meet
  useEffect(() => {
    if (open) {
      console.log("🚀 Device selection modal opened - requesting permissions immediately")
      // Don't wait for user to click - request permissions immediately like Google Meet
      setTimeout(() => {
        requestPermissionsAndEnumerateDevices()
      }, 100) // Small delay to let the modal render
    } else {
      // Clean up preview stream when modal closes
      if (previewStream) {
        console.log("🧹 Cleaning up preview stream")
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

  const handleConfirm = async () => {
    console.log("✅ Confirming device selection")
    console.log("Selected video device:", selectedVideoDevice)
    console.log("Selected audio device:", selectedAudioDevice)

    try {
      // Validate that the selected devices are still available
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoExists = devices.some(d => d.deviceId === selectedVideoDevice)
      const audioExists = devices.some(d => d.deviceId === selectedAudioDevice)

      if (!videoExists) {
        throw new Error("Selected camera is no longer available")
      }
      if (!audioExists) {
        throw new Error("Selected microphone is no longer available")
      }

      // Create a new stream with both video and audio
      const stream = await navigator.mediaDevices.getUserMedia({
        video: selectedVideoDevice ? { deviceId: { exact: selectedVideoDevice } } : true,
        audio: selectedAudioDevice ? { deviceId: { exact: selectedAudioDevice } } : true
      })

      // Stop the preview-only stream
      if (previewStream) {
        previewStream.getTracks().forEach((track) => track.stop())
      }

      // Set the new stream as the preview stream
      setPreviewStream(stream)
      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = stream
      }

      // Pass the device IDs to the parent
      onDevicesSelected(selectedVideoDevice || null, selectedAudioDevice || null)
      onOpenChange(false)
    } catch (error: any) {
      console.error("Error validating devices:", error)
      setError(`Failed to validate devices: ${error.message}. Please try selecting different devices or refresh the list.`)
    }
  }

  const handleRefresh = () => {
    console.log("🔄 Refreshing devices")
    // Reset state
    setSelectedVideoDevice("")
    setSelectedAudioDevice("")
    setError(null)
    setNeedsPermissionPrompt(false)
    if (previewStream) {
      previewStream.getTracks().forEach((track) => track.stop())
      setPreviewStream(null)
    }
    // Re-enumerate devices
    requestPermissionsAndEnumerateDevices()
  }

  const handleOpenBrowserSettings = () => {
    const currentUrl = window.location.href
    const httpsUrl = currentUrl.replace('http://', 'https://')
    
    alert(`To enable camera and microphone access:

OPTION 1 - Use HTTPS (Recommended):
• Click this link to access the secure version: ${httpsUrl}
• Or manually change "http://" to "https://" in your address bar

OPTION 2 - Browser Settings:
1. Click the camera/microphone icon in your browser's address bar
2. Select "Allow" for both camera and microphone
3. Refresh this page

OPTION 3 - Chrome Settings:
• Chrome: Settings → Privacy and security → Site Settings → Camera/Microphone
• Firefox: Settings → Privacy & Security → Permissions → Camera/Microphone
• Safari: Safari → Settings → Websites → Camera/Microphone

Note: Most browsers require HTTPS for camera/microphone access for security reasons.`)
  }

  const handleTryHttps = () => {
    const currentUrl = window.location.href
    const httpsUrl = currentUrl.replace('http://', 'https://')
    window.location.href = httpsUrl
  }

  // Test mode for HTTP environments (for debugging)
  const handleTestMode = async () => {
    console.log("🧪 Test mode - simulating device detection")
    setIsLoading(true)
    setError(null)

    try {
      // Simulate device detection for testing
      const simulatedDevices = [
        {
          deviceId: "test-camera-1",
          label: "Test Camera 1 (Simulated)",
          kind: "videoinput" as MediaDeviceKind,
        },
        {
          deviceId: "test-camera-2", 
          label: "Test External Camera (Simulated)",
          kind: "videoinput" as MediaDeviceKind,
        },
        {
          deviceId: "test-mic-1",
          label: "Test Microphone 1 (Simulated)", 
          kind: "audioinput" as MediaDeviceKind,
        },
        {
          deviceId: "test-mic-2",
          label: "Test External Microphone (Simulated)",
          kind: "audioinput" as MediaDeviceKind,
        }
      ]

      await processDevices(simulatedDevices, false)
      setError("Test mode active - simulated devices shown. Real device access requires HTTPS.")
      
    } catch (error) {
      setError("Test mode failed")
    } finally {
      setIsLoading(false)
    }
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
              <AlertDescription>
                {error}
                <div className="mt-3 flex flex-wrap gap-2">
                  {(error.includes("HTTPS") || error.includes("https://") || !isSecureContext()) && (
                    <Button
                      size="sm"
                      onClick={handleTryHttps}
                      className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                    >
                      <Globe className="h-4 w-4" />
                      Switch to HTTPS
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenBrowserSettings}
                    className="flex items-center gap-2"
                  >
                    <Shield className="h-4 w-4" />
                    Get Help
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {needsPermissionPrompt && (
            <Alert className="border-blue-200 bg-blue-50">
              <Shield className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Permission Request:</strong> Your browser is asking for camera and microphone access. Please click "Allow" in the popup to continue. This is required for streaming.
              </AlertDescription>
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
              <div className="flex items-center justify-center mb-4">
                <div className="relative">
                  <Camera className="h-12 w-12 text-orange-500" />
                  <Mic className="h-6 w-6 absolute -bottom-1 -right-1 text-orange-600" />
                </div>
              </div>
              <p className="text-lg font-medium mb-2">Setting Up Your Camera & Microphone</p>
              <p className="text-muted-foreground mb-4">
                {!isSecureContext() 
                  ? "For security, browsers require HTTPS to access your camera and microphone. Please switch to the secure version of this site."
                  : "We're requesting access to your camera and microphone. Your browser will show a permission popup - please click \"Allow\" to continue."
                }
              </p>
              <div className="space-y-2">
                                  <div className="flex flex-wrap gap-2 justify-center">
                    {!isSecureContext() ? (
                      <>
                        <Button
                          onClick={handleTryHttps}
                          className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                        >
                          <Globe className="h-4 w-4" />
                          Switch to HTTPS (Secure)
                        </Button>
                        <Button
                          onClick={handleTestMode}
                          variant="outline"
                          className="flex items-center gap-2"
                          disabled={isLoading}
                        >
                          <Camera className="h-4 w-4" />
                          {isLoading ? "Testing..." : "Test Mode"}
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={requestPermissionsAndEnumerateDevices}
                        className="bg-gradient-to-r from-orange-600 to-orange-500"
                        disabled={isLoading}
                      >
                        {isLoading ? "Requesting Access..." : "Try Again"}
                      </Button>
                    )}
                    <Button
                      onClick={handleOpenBrowserSettings}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <Shield className="h-4 w-4" />
                      Need Help?
                    </Button>
                  </div>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                {!isSecureContext() 
                  ? "🔒 HTTPS is required for camera/microphone access in modern browsers"
                  : "💡 If you don't see a permission popup, check if it's blocked in your browser's address bar"
                }
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? "Refreshing..." : "Refresh Devices"}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!permissionGranted || !selectedVideoDevice}
              className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 flex-1"
            >
              Continue with Selected Devices
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
