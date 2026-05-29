import { createContext, useContext, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

// Build a minimal profile from the auth user so the UI is never blocked.
// @clinica-cotten.com emails get 'admin' immediately; other emails get
// 'unknown' so RequireStaff waits for the DB profile rather than
// redirecting them to the patient area.
function profileFromUser(user) {
  const email = user.email ?? ''
  return {
    id:        user.id,
    email,
    full_name: email,
    role:      email.endsWith('@clinica-cotten.com') ? 'admin' : 'unknown',
  }
}

// Attempt a profile fetch with a hard 3-second timeout.
// Returns the DB row on success, null on timeout / RLS error / missing row.
async function fetchProfileWithTimeout(userId) {
  const timeout = new Promise(resolve => setTimeout(() => resolve({ data: null, error: 'timeout' }), 3000))
  const query   = supabase.from('profiles').select('*').eq('id', userId).single()
  const { data, error } = await Promise.race([query, timeout])
  if (error) {
    console.warn('[Auth] profile fetch skipped:', error?.message ?? error)
    return null
  }
  return data
}

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return
        console.log('[Auth]', event, session?.user?.email ?? '(signed out)')

        if (session?.user) {
          // 1. Set role immediately from email — unblocks navigation at once.
          const immediate = profileFromUser(session.user)
          setUser(session.user)
          setProfile(immediate)
          setLoading(false)

          // 2. Try to enrich with the real DB row in the background.
          //    Uses setTimeout to push outside the synchronous auth callback
          //    (avoids Supabase's internal deadlock on nested client calls).
          setTimeout(async () => {
            if (!mounted) return
            const dbProfile = await fetchProfileWithTimeout(session.user.id)
            if (dbProfile && mounted) {
              console.log('[Auth] profile enriched from DB:', dbProfile.full_name, dbProfile.role)
              setProfile(dbProfile)
            }
          }, 0)
        } else {
          setUser(null)
          setProfile(null)
          setLoading(false)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut: handleSignOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

const STAFF_ROLES = ['admin', 'doctor', 'staff', 'receptionist']

// Only patients may enter /paciente/* routes.
export function RequirePatient({ children }) {
  const { user, profile, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/acceso-paciente" replace />
  // Wait for DB profile to resolve before redirecting staff away
  if (profile?.role === 'unknown') return null
  if (STAFF_ROLES.includes(profile?.role)) return <Navigate to="/admin/panel" replace />
  return children
}

// Only staff / admin / doctor / receptionist may enter /admin/* routes.
export function RequireStaff({ children }) {
  const { user, profile, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/acceso-personal" replace />
  // Wait for DB profile to resolve for non-clinic emails
  if (profile?.role === 'unknown') return null
  if (profile?.role === 'patient') return <Navigate to="/paciente/inicio" replace />
  return children
}