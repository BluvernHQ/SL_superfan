"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Eye, EyeOff, Play, Mail, Lock, User, AlertCircle, Check, X } from "lucide-react"
import Link from "next/link"
import { auth } from "@/lib/firebase"
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth"
import { useRouter, useSearchParams } from "next/navigation"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [isCheckingUsername, setIsCheckingUsername] = useState(false)
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "error">("idle")
  const [usernameCheckTimeout, setUsernameCheckTimeout] = useState<NodeJS.Timeout | null>(null)
  const [signupStep, setSignupStep] = useState<"creating" | "logging_in" | "creating_profile" | "complete">("complete")
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectPath = searchParams.get("redirect")
  const openStreamModal = searchParams.get("openStreamModal")

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    username: "",
    confirmPassword: "",
  })

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      if (currentUser && signupStep === "complete") {
        // Build redirect URL with parameters
        let redirectUrl = "/"
        const params = new URLSearchParams()

        if (redirectPath === "stream") {
          params.set("redirect", "stream")
        }

        if (openStreamModal === "true") {
          params.set("openStreamModal", "true")
        }

        if (params.toString()) {
          redirectUrl += "?" + params.toString()
        }

        router.push(redirectUrl)
      }
    })

    return () => unsubscribe()
  }, [router, redirectPath, openStreamModal, signupStep])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })

    // Clear error when user types
    setError(null)

    // Handle username checking with debounce
    if (name === "username") {
      // Clear previous timeout
      if (usernameCheckTimeout) {
        clearTimeout(usernameCheckTimeout)
      }

      // Reset status if username is empty or too short
      if (value.length < 3) {
        setUsernameStatus("idle")
        return
      }

      // Set checking status
      setUsernameStatus("checking")

      // Set new timeout for username check
      const timeout = setTimeout(() => {
        checkUsernameAvailability(value)
      }, 500) // 500ms debounce

      setUsernameCheckTimeout(timeout)
    }
  }

  const checkUsernameAvailability = async (username: string) => {
    if (!username || username.length < 3) {
      setUsernameStatus("idle")
      return
    }

    try {
      setIsCheckingUsername(true)

      // For username checking during signup, we don't need auth token
      // as the user isn't authenticated yet
      const response = await fetch("https://superfan.alterwork.in/api/check_username", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payload: { username },
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setUsernameStatus("available")
      } else if (response.status === 400) {
        setUsernameStatus("taken")
      } else {
        setUsernameStatus("error")
      }
    } catch (error) {
      console.error("Error checking username:", error)
      setUsernameStatus("error")
    } finally {
      setIsCheckingUsername(false)
    }
  }

  const createUserInDatabase = async (firebaseUser: any) => {
    try {
      // Get fresh token from the authenticated user
      const idToken = await firebaseUser.getIdToken(true) // Force refresh

      console.log("Creating user in database with token...")
      console.log("Firebase ID Token:", idToken) // Added for debugging

      const payload = {
        username: firebaseUser.displayName || formData.username,
      }
      console.log("Payload for create_user:", payload) // Added for debugging

      const response = await fetch("https://superfan.alterwork.in/api/create_user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          payload: {
            username: firebaseUser.displayName || formData.username,
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("Database user creation failed with status:", response.status, errorData)
        throw new Error(errorData.message || `Failed to create user in database: ${response.statusText}`)
      }

      const userData = await response.json()
      console.log("User created in database successfully:", userData)
      return userData
    } catch (error: any) {
      console.error("Error creating user in database:", error)
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        throw new Error(
          "Network error: Could not connect to the server. Please check your internet connection or try again later.",
        )
      }
      throw new Error(error.message || "An unexpected error occurred during user creation.")
    }
  }

  const validateUsername = (username: string): string | null => {
    if (!username.trim()) {
      return "Username is required"
    }
    if (username.length < 3) {
      return "Username must be at least 3 characters long"
    }
    if (username.length > 20) {
      return "Username must be less than 20 characters"
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return "Username can only contain letters, numbers, and underscores"
    }
    return null
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // Set persistence based on remember me checkbox
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence)

      // Sign in with email and password
      const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password)

      console.log("User logged in successfully:", {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: userCredential.user.displayName,
      })

      // Redirect is handled by the auth state change listener
    } catch (error: any) {
      console.error("Login error:", error)
      setError(getFirebaseErrorMessage(error.code))
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSignupStep("creating")

    // Validate username
    const usernameError = validateUsername(formData.username)
    if (usernameError) {
      setError(usernameError)
      setIsLoading(false)
      setSignupStep("complete")
      return
    }

    // Check if username is available
    if (usernameStatus !== "available") {
      setError("Please choose an available username")
      setIsLoading(false)
      setSignupStep("complete")
      return
    }

    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      setSignupStep("complete")
      return
    }

    try {
      // Step 1: Create user with email and password
      console.log("Creating Firebase user...")
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password)
      const firebaseUser = userCredential.user

      // Step 2: Update the user's profile with the username
      console.log("Updating user profile with username...")
      await updateProfile(firebaseUser, {
        displayName: formData.username,
      })

      console.log("Firebase user created successfully:", {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
      })

      // Step 3: Log in the user (they should already be logged in after createUserWithEmailAndPassword)
      setSignupStep("logging_in")

      // Ensure user is properly authenticated
      await firebaseUser.reload()

      // Step 4: Create user profile in database
      setSignupStep("creating_profile")
      console.log("Creating user profile in database...")

      try {
        await createUserInDatabase(firebaseUser)
        console.log("User profile created in database successfully")
      } catch (dbError) {
        console.error("Failed to create user in database:", dbError)
        // Show error but don't prevent login since Firebase user is created
        setError("Account created but profile setup failed. Please contact support.")
      }

      // Step 5: Complete signup
      setSignupStep("complete")

      // Redirect is handled by the auth state change listener
    } catch (error: any) {
      console.error("Signup error:", error)
      setError(getFirebaseErrorMessage(error.code))
      setSignupStep("complete")
    } finally {
      setIsLoading(false)
    }
  }

  // Helper function to get user-friendly error messages
  const getFirebaseErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
      case "auth/email-already-in-use":
        return "This email is already in use. Please try logging in instead."
      case "auth/invalid-email":
        return "Please enter a valid email address."
      case "auth/weak-password":
        return "Password should be at least 6 characters."
      case "auth/user-not-found":
        return "No account found with this email. Please sign up."
      case "auth/wrong-password":
        return "Incorrect password. Please try again."
      case "auth/too-many-requests":
        return "Too many unsuccessful login attempts. Please try again later."
      default:
        return "An error occurred. Please try again."
    }
  }

  const getUsernameStatusIcon = () => {
    switch (usernameStatus) {
      case "checking":
        return <div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
      case "available":
        return <Check className="w-4 h-4 text-green-600" />
      case "taken":
        return <X className="w-4 h-4 text-red-600" />
      case "error":
        return <AlertCircle className="w-4 h-4 text-yellow-600" />
      default:
        return null
    }
  }

  const getUsernameStatusMessage = () => {
    switch (usernameStatus) {
      case "checking":
        return "Checking availability..."
      case "available":
        return "Username is available!"
      case "taken":
        return "Username is already taken"
      case "error":
        return "Error checking username"
      default:
        return "3-20 characters, letters, numbers, and underscores only"
    }
  }

  const getUsernameStatusColor = () => {
    switch (usernameStatus) {
      case "available":
        return "text-green-600"
      case "taken":
        return "text-red-600"
      case "error":
        return "text-yellow-600"
      default:
        return "text-muted-foreground"
    }
  }

  const getSignupButtonText = () => {
    switch (signupStep) {
      case "creating":
        return "Creating account..."
      case "logging_in":
        return "Logging in..."
      case "creating_profile":
        return "Setting up profile..."
      default:
        return "Create Account"
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-amber-50 dark:from-orange-950/20 dark:via-orange-900/10 dark:to-amber-950/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-orange-600 to-orange-500 rounded-full mb-6 shadow-lg">
            <Play className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent mb-2">
            Superfan
          </h1>
          <p className="text-muted-foreground text-lg">Welcome to your streaming platform</p>
          <p className="text-sm text-muted-foreground mt-2">Connect, create, and share your passion with the world</p>
        </div>

        {/* Main Card */}
        <Card className="shadow-xl backdrop-blur-sm bg-white/95 dark:bg-card/95">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl text-center">Welcome Back</CardTitle>
            <CardDescription className="text-center">
              Sign in to your account or create a new one to get started
              {(redirectPath === "stream" || openStreamModal === "true") && (
                <span className="block mt-2 text-orange-600 dark:text-orange-400 font-medium">
                  Sign in to start streaming
                </span>
              )}
            </CardDescription>
          </CardHeader>

          {error && (
            <div className="px-6">
              <Alert variant="destructive" className="mb-4 border-red-300 dark:border-red-800">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
          )}

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger
                value="login"
                className="data-[state=active]:bg-orange-100 dark:data-[state=active]:bg-orange-900"
              >
                Sign In
              </TabsTrigger>
              <TabsTrigger
                value="register"
                className="data-[state=active]:bg-orange-100 dark:data-[state=active]:bg-orange-900"
              >
                Sign Up
              </TabsTrigger>
            </TabsList>

            {/* Login Tab */}
            <TabsContent value="login">
              <form onSubmit={handleLogin}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="Enter your email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="pl-10 border-orange-200 dark:border-orange-800 focus:border-orange-500 dark:focus:border-orange-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className="pl-10 pr-10 border-orange-200 dark:border-orange-800 focus:border-orange-500 dark:focus:border-orange-500"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="remember"
                        checked={rememberMe}
                        onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                        className="border-orange-300 data-[state=checked]:bg-orange-600"
                      />
                      <Label htmlFor="remember" className="text-sm">
                        Remember me
                      </Label>
                    </div>
                    <Link
                      href="/forgot-password"
                      className="text-sm text-orange-600 hover:text-orange-700 hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col space-y-4">
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-medium py-2.5"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Signing in...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>

            {/* Register Tab */}
            <TabsContent value="register">
              <form onSubmit={handleSignup}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-sm font-medium">
                      Username <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        id="username"
                        name="username"
                        type="text"
                        placeholder="Choose a unique username"
                        value={formData.username}
                        onChange={handleInputChange}
                        className="pl-10 pr-10 border-orange-200 dark:border-orange-800 focus:border-orange-500 dark:focus:border-orange-500"
                        required
                        minLength={3}
                        maxLength={20}
                        pattern="[a-zA-Z0-9_]+"
                        title="Username can only contain letters, numbers, and underscores"
                        disabled={isLoading}
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        {getUsernameStatusIcon()}
                      </div>
                    </div>
                    <p className={`text-xs ${getUsernameStatusColor()}`}>{getUsernameStatusMessage()}</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-email" className="text-sm font-medium">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        id="reg-email"
                        name="email"
                        type="email"
                        placeholder="Enter your email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="pl-10 border-orange-200 dark:border-orange-800 focus:border-orange-500 dark:focus:border-orange-500"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-password" className="text-sm font-medium">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        id="reg-password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className="pl-10 pr-10 border-orange-200 dark:border-orange-800 focus:border-orange-500 dark:focus:border-orange-500"
                        required
                        minLength={6}
                        disabled={isLoading}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLoading}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password" className="text-sm font-medium">
                      Confirm Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        id="confirm-password"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className="pl-10 pr-10 border-orange-200 dark:border-orange-800 focus:border-orange-500 dark:focus:border-orange-500"
                        required
                        disabled={isLoading}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        disabled={isLoading}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="terms"
                      className="border-orange-300 data-[state=checked]:bg-orange-600"
                      required
                      disabled={isLoading}
                    />
                    <Label htmlFor="terms" className="text-sm">
                      I agree to the{" "}
                      <Link href="/terms" className="text-orange-600 hover:text-orange-700 hover:underline">
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link href="/privacy" className="text-orange-600 hover:text-orange-700 hover:underline">
                        Privacy Policy
                      </Link>
                    </Label>
                  </div>
                </CardContent>

                <CardFooter>
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-medium py-2.5"
                    disabled={isLoading || usernameStatus !== "available"}
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        {getSignupButtonText()}
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  )
}
