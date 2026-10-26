export type ApiErrorCode =
  | 'NETWORK'
  | 'INVALID_REQUEST'
  | 'SLOT_NOT_FOUND'
  | 'SLOT_STARTED'
  | 'NOT_ENOUGH_TICKETS'
  | 'BOOKING_NOT_FOUND'
  | 'BOOKING_ALREADY_CANCELLED'

/** Typed error thrown by the API. The UI maps `code` to a translated message. */
export class ApiError extends Error {
  readonly code: ApiErrorCode

  constructor(code: ApiErrorCode, message: string = code) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

export function getApiErrorCode(error: unknown): ApiErrorCode {
  return error instanceof ApiError ? error.code : 'NETWORK'
}
