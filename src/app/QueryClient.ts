import { QueryClient } from '@tanstack/react-query'

const QUERY_RETRIES = 2

/**
 * Reads are retried, because the network fails often and a read is safe to repeat.
 * Mutations are never retried automatically: the devotee decides to try again.
 */
export function createQueryClient(retry: number | false = QUERY_RETRIES): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry },
      mutations: { retry: false },
    },
  })
}

/** Every cache key in one place, so invalidation cannot drift from the queries. */
export const queryKeys = {
  temples: ['temples'] as const,
  slotsRoot: ['slots'] as const,
  slots: (templeId: string, date: string) => ['slots', templeId, date] as const,
}
