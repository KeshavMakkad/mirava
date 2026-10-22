import { useQuery } from '@tanstack/react-query'

export interface AuthProviders {
  google: boolean
}

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

/**
 * Which optional sign-in methods are switched on in the Supabase project, so
 * the UI never shows a Google button that would fail with
 * "provider is not enabled". Returns null while loading; if the settings
 * can't be read, assumes they're on (the button then shows Supabase's error).
 */
export function useAuthProviders(): AuthProviders | null {
  const { data, isError } = useQuery({
    queryKey: ['auth-providers'],
    queryFn: async (): Promise<AuthProviders> => {
      const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key ?? '' } })
      if (!res.ok) throw new Error(`settings ${res.status}`)
      const ext = (await res.json())?.external ?? {}
      return { google: !!ext.google }
    },
    staleTime: 5 * 60_000,
    retry: 1,
    enabled: !!url,
  })
  if (isError || !url) return { google: true }
  return data ?? null
}
