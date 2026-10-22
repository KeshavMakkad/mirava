import type { Session, User } from '@supabase/supabase-js'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ApiError, api, type Me, type Profile, type Role } from '../lib/api'
import { supabase } from '../lib/supabase'

export interface SignUpInput {
  email: string
  password: string
  username: string
  displayName?: string
  /** Where to land after the confirmation link. */
  next?: string
}

interface AuthContextValue {
  session: Session | null
  user: User | null
  /** Profile, badges and rank from the backend; null until loaded or when signed out. */
  me: Me | null
  /** True until the initial Supabase session check has finished. */
  loading: boolean
  role: Role | null
  signIn: (email: string, password: string) => Promise<void>
  /** Creates the account and emails a confirmation link (sent by our backend). */
  signUp: (input: SignUpInput) => Promise<void>
  sendMagicLink: (email: string, next?: string) => Promise<void>
  /** Redirects to Google; Supabase returns to /auth/callback?next=<next>. */
  signInWithGoogle: (next?: string) => Promise<void>
  sendPasswordReset: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshMe: () => Promise<unknown>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const redirectTo = (path: string) => `${window.location.origin}${path}`

/** The backend answers 503 "Email is not configured" until its emailer is set up. */
function emailerMissing(e: unknown): boolean {
  return e instanceof ApiError && e.status === 503 && /not configured/i.test(e.message)
}

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const queryClient = useQueryClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setLoading(false)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const userId = session?.user.id ?? null
  const meQuery = useQuery({
    queryKey: ['me', userId],
    queryFn: api.me.get,
    enabled: !!userId,
    staleTime: 30_000,
    retry: 2,
  })

  // Hand the signed-in profile to the English/Hindi runtime: it applies the
  // saved preferred_language on sign-in (unless this browser has an explicit
  // choice, which it saves to the profile instead) and persists later toggles.
  const profileId = meQuery.data?.profile.id ?? null
  const preferredLanguage = meQuery.data?.profile.preferred_language ?? null
  useEffect(() => {
    const i18n = window.MiravaI18n
    if (!i18n) return
    if (!userId || !profileId) {
      // Signed out (or profile not loaded yet): forget the account.
      if (!userId) i18n.connectAccount(null)
      return
    }
    i18n.connectAccount({ id: profileId, preferredLanguage }, async (fields) => {
      const body: Parameters<typeof api.me.update>[0] = {}
      if (fields.displayName !== undefined) body.display_name = fields.displayName
      if (fields.bio !== undefined) body.bio = fields.bio
      if (fields.location !== undefined) body.location = fields.location
      if (fields.preferredLanguage === 'en' || fields.preferredLanguage === 'hi') body.preferred_language = fields.preferredLanguage
      if (fields.avatar !== undefined) body.avatar = fields.avatar as Profile['avatar']
      const profile = await api.me.update(body)
      queryClient.setQueryData<Me>(['me', userId], (old) => (old ? { ...old, profile: { ...old.profile, ...profile } } : old))
      return profile
    })
  }, [userId, profileId, preferredLanguage, queryClient])

  const refreshMe = useCallback(() => queryClient.invalidateQueries({ queryKey: ['me'] }), [queryClient])

  const value = useMemo<AuthContextValue>(() => {
    const user = session?.user ?? null
    const me = userId ? (meQuery.data ?? null) : null
    return {
      session,
      user,
      me,
      loading,
      role: me?.profile.role ?? null,

      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        fail(error)
      },

      async signUp({ email, password, username, displayName, next }) {
        try {
          await api.auth.signup({ email, password, username, display_name: displayName || username, next })
        } catch (e) {
          if (!emailerMissing(e)) throw e
          // Our emailer isn't configured on this server yet: use Supabase's own mailer.
          const { error } = await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: redirectTo('/auth/callback'), data: { username, display_name: displayName || username } },
          })
          fail(error)
        }
      },

      async sendMagicLink(email, next) {
        try {
          await api.auth.magicLink(email, next)
        } catch (e) {
          if (!emailerMissing(e)) throw e
          const { error } = await supabase.auth.signInWithOtp({
            email,
            options: { emailRedirectTo: redirectTo(`/auth/callback?next=${encodeURIComponent(next || '/explore')}`) },
          })
          fail(error)
        }
      },

      async signInWithGoogle(next) {
        const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/explore'
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: redirectTo(`/auth/callback?next=${encodeURIComponent(safeNext)}`) },
        })
        fail(error)
      },

      async sendPasswordReset(email) {
        try {
          await api.auth.passwordReset(email)
        } catch (e) {
          if (!emailerMissing(e)) throw e
          const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectTo('/reset-password') })
          fail(error)
        }
      },

      async updatePassword(password) {
        const { error } = await supabase.auth.updateUser({ password })
        fail(error)
      },

      async signOut() {
        await supabase.auth.signOut()
        queryClient.clear()
      },

      refreshMe,
    }
  }, [session, loading, userId, meQuery.data, queryClient, refreshMe])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
