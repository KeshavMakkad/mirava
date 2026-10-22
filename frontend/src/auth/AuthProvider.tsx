import type { Session, User } from '@supabase/supabase-js'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, type Me, type Profile, type Role } from '../lib/api'
import { supabase } from '../lib/supabase'

export interface SignUpInput {
  email: string
  password: string
  username: string
  displayName?: string
  role: Exclude<Role, 'admin'>
}

interface AuthContextValue {
  session: Session | null
  user: User | null
  /** Profile, badges and rank from the backend; null until loaded or when signed out. */
  me: Me | null
  /** True until the initial Supabase session check has finished. */
  loading: boolean
  isGuest: boolean
  role: Role | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (input: SignUpInput) => Promise<{ needsConfirmation: boolean }>
  sendMagicLink: (email: string) => Promise<void>
  /** Redirects to Google; Supabase returns to /auth/callback?next=<next>. */
  signInWithGoogle: (next?: string) => Promise<void>
  continueAsGuest: () => Promise<void>
  /**
   * Link an email to the current anonymous session (same user id, so progress
   * is kept). Supabase only allows setting a password once that email is
   * verified, so the confirmation link lands on /reset-password?setup=1.
   */
  upgradeGuest: (email: string) => Promise<void>
  sendPasswordReset: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshMe: () => Promise<unknown>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const redirectTo = (path: string) => `${window.location.origin}${path}`

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
      isGuest: !!user?.is_anonymous,
      role: me?.profile.role ?? null,

      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        fail(error)
      },

      async signUp({ email, password, username, displayName, role }) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectTo('/auth/callback'),
            data: { username, display_name: displayName || username, role },
          },
        })
        fail(error)
        return { needsConfirmation: !data.session }
      },

      async sendMagicLink(email) {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: redirectTo('/auth/callback'), shouldCreateUser: true },
        })
        fail(error)
      },

      async signInWithGoogle(next) {
        const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/explore'
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: redirectTo(`/auth/callback?next=${encodeURIComponent(safeNext)}`) },
        })
        fail(error)
      },

      async continueAsGuest() {
        const { error } = await supabase.auth.signInAnonymously()
        fail(error)
      },

      async upgradeGuest(email) {
        const { error } = await supabase.auth.updateUser(
          { email },
          { emailRedirectTo: redirectTo('/reset-password?setup=1') },
        )
        fail(error)
      },

      async sendPasswordReset(email) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectTo('/reset-password') })
        fail(error)
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
