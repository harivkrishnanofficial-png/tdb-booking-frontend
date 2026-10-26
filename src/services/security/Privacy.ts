/*
 * Privacy helpers used by the mock server to protect personal data at rest.
 *
 * In production these run on the backend, with keys held in a KMS/HSM. Here
 * they simulate that boundary: the keys are generated per session as
 * non-extractable Web Crypto keys, so no key material exists in the bundle.
 */

const encoder = new TextEncoder()
const decoder = new TextDecoder()
const AES_IV_BYTES = 12

export interface EncryptedValue {
  iv: string
  cipherText: string
}

// Created lazily, so importing this module never triggers Web Crypto work.
let encryptionKey: Promise<CryptoKey> | undefined
let lookupKey: Promise<CryptoKey> | undefined
let signingKey: Promise<CryptoKey> | undefined

function getEncryptionKey(): Promise<CryptoKey> {
  encryptionKey ??= crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
    'encrypt',
    'decrypt',
  ])
  return encryptionKey
}

function createHmacKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
}

function toBase64(bytes: ArrayBuffer | Uint8Array): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0))
}

async function hmacHex(key: Promise<CryptoKey>, value: string): Promise<string> {
  const signature = await crypto.subtle.sign('HMAC', await key, encoder.encode(value))
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** Encrypts a value with AES-256-GCM and a fresh random IV. */
export async function encrypt(plainText: string): Promise<EncryptedValue> {
  const iv = crypto.getRandomValues(new Uint8Array(AES_IV_BYTES))
  const cipherText = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await getEncryptionKey(),
    encoder.encode(plainText),
  )
  return { iv: toBase64(iv), cipherText: toBase64(cipherText) }
}

export async function decrypt(value: EncryptedValue): Promise<string> {
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(value.iv) },
    await getEncryptionKey(),
    fromBase64(value.cipherText),
  )
  return decoder.decode(plain)
}

/**
 * Keyed hash for finding records by phone or ID without storing them in clear.
 * A plain SHA-256 would not be enough: 10-digit phone numbers can be brute-forced.
 */
export function hashForLookup(value: string): Promise<string> {
  lookupKey ??= createHmacKey()
  return hmacHex(lookupKey, value)
}

/** Signs a QR payload so gate officers can detect forged or edited tickets. */
export function sign(payload: string): Promise<string> {
  signingKey ??= createHmacKey()
  return hmacHex(signingKey, payload)
}

/** 9876543210 → 98XXXXXX10 */
export function maskPhone(phone: string): string {
  return `${phone.slice(0, 2)}${'X'.repeat(phone.length - 4)}${phone.slice(-2)}`
}

/** Keeps the last four characters, which is what officers compare against the card. */
export function maskIdNumber(idNumber: string): string {
  return `${'X'.repeat(Math.max(idNumber.length - 4, 0))}${idNumber.slice(-4)}`
}
