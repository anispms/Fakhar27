// In production the combined backend serves both the auth/admin API and the
// product API from the same host, so both URLs point at VITE_API_URL.
// Locally they still default to the two separate dev servers.
export const AUTH_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
export const PRODUCT_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
