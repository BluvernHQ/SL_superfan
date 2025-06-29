// API Configuration
export const API_CONFIG = {
  // Base URLs
  BASE_URL: "https://superfan.alterwork.in",
  API_BASE_URL: "https://superfan.alterwork.in/api",
  FILES_BASE_URL: "https://superfan.alterwork.in/files",
  
  // API Endpoints
  ENDPOINTS: {
    // User management
    GET_USER: "get_user",
    CREATE_USER: "create_user",
    CHECK_USERNAME: "check_username",
    EDIT_PROFILE: "edit_profile",
    GET_ABOUT: "get_about",
    FETCH_USERS: "fetch_users",
    
    // Social features
    CREATE_FOLLOWER: "create_follower",
    UN_FOLLOW: "un_follow",
    DID_FOLLOW: "did_follow",
    FETCH_FOLLOWERS: "fetch_followers",
    FETCH_FOLLOWING: "fetch_following",
    FOLLOW_USER: "follow_user",
    UNFOLLOW_USER: "unfollow_user",
    
    // Blocking/Moderation
    ADD_BLOCKLIST: "add_blocklist",
    REMOVE_BLOCKLIST: "remove_blocklist",
    FETCH_BLOCKLIST: "fetch_blocklist",
    IS_BLOCKLIST: "is_blocklist",
    AMI_BLOCKLIST: "ami_blocklist",
    
    // Streaming
    CREATE_STREAM: "create_stream",
    GET_LIVE: "get_live",
    GET_LIVE_DET: "get_live_det",
    JANUS_PROXY: "janus_proxy",
    GET_VIEWS: "get_views",
    
    // Videos/Recording
    GET_REC: "get_rec",
    CREATE_VIEW: "create_view",
    CREATE_LIKE: "create_like",
  },
  
  // File paths
  FILES: {
    PROFILE_PIC: "profilepic",
    VIDEOS: "videos", 
    THUMBNAILS: "thumbnails",
  }
}

// Helper functions for building URLs
export const buildApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.API_BASE_URL}/${endpoint}`
}

export const buildFileUrl = (type: keyof typeof API_CONFIG.FILES, filename: string): string => {
  return `${API_CONFIG.FILES_BASE_URL}/${API_CONFIG.FILES[type]}/${filename}`
}

export const buildProfilePicUrl = (username: string): string => {
  return buildFileUrl("PROFILE_PIC", `${username}.png`)
}

export const buildThumbnailUrl = (hookId: string): string => {
  return buildFileUrl("THUMBNAILS", `${hookId}.jpg`)
}

export const buildVideoUrl = (videoId: string): string => {
  return buildFileUrl("VIDEOS", `${videoId}.webm`)
} 