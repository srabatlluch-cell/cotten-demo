import { createContext, useContext, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

// Derive role instantly from email — no DB call required.
// Staff addresses end with @clinica-cotten.com; everything else is a patient.
function roleFromEmail(email) {
  if (!email) return 'patient'
  return email.endsWith('@clinica-cotten.com') ? 'admin' : 'patient'
}

// Build a minimal profile from the auth user so the UI is never blocked.
function profileFromUser(user) {
  return {
    id:        user.id,
    email:     user.email,
    full_name: user.email,   // overwritten once the real DB row arrives
    role:      roleFromEmail(user.email),
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

// Only patients may enter /paciente/* routes.
export function RequirePatient({ children }) {
  const { user, profile, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/acceso-paciente" replace />
  if (profile?.role && profile.role !== 'patient') return <Navigate to="/admin/panel" replace />
  return children
}

// Only staff / admin / doctor may enter /admin/* routes.
export function RequireStaff({ children }) {
  const { user, profile, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/acceso-personal" replace />
  if (profile?.role === 'patient') return <Navigate to="/paciente/inicio" replace />
  return children
}