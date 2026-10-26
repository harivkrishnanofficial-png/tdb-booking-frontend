import { describe, expect, it } from 'vitest'
import type { IdType } from '../models/Booking.model'
import { getAgeCategory, isValidIdNumber } from './Validators'

describe('isValidIdNumber', () => {
  it.each<[IdType, string, boolean]>([
    ['aadhaar', '2345 6789 0123', true],
    ['aadhaar', '1234 5678 9012', false], // Aadhaar never starts with 0 or 1
    ['voter', 'abc1234567', true],
    ['voter', 'AB12345678', false],
    ['driving', 'KL07 20110012345', true],
    ['driving', 'KL0720110', false],
    ['passport', 'A1234567', true],
    ['pan', 'ABCDE1234F', true],
    ['pan', 'ABCDE12345', false],
  ])('%s "%s" → %s', (idType, value, expected) => {
    expect(isValidIdNumber(idType, value)).toBe(expected)
  })
})

describe('getAgeCategory', () => {
  it('splits devotees into child, adult and senior citizen at 12 and 60', () => {
    expect([11, 12, 59, 60].map(getAgeCategory)).toEqual(['child', 'adult', 'adult', 'senior'])
  })
})
