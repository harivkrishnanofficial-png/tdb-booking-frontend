/** Text the temple board publishes in both interface languages. */
export interface LocalizedText {
  en: string
  ml: string
}

export interface Temple {
  id: string
  name: LocalizedText
  location: LocalizedText
}

export interface Slot {
  id: string
  templeId: string
  /** Calendar day in IST, formatted as YYYY-MM-DD. */
  date: string
  /** Start instant as an ISO 8601 UTC string. */
  startsAt: string
  capacity: number
  remaining: number
}
