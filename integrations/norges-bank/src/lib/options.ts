import { z } from 'zod';
import { norgesBankServiceError } from './errors';

export const frequencies = ['B', 'M', 'A'] as const;
export type Frequency = (typeof frequencies)[number];

export const frequencyNames: Record<Frequency, string> = {
  B: 'Business',
  M: 'Monthly',
  A: 'Annual'
};

export const exchangeBaseCurrencies = [
  'AUD',
  'BDT',
  'BGN',
  'BRL',
  'BYN',
  'CAD',
  'CHF',
  'CNY',
  'CZK',
  'DKK',
  'EUR',
  'GBP',
  'HKD',
  'HRK',
  'HUF',
  'I44',
  'IDR',
  'ILS',
  'INR',
  'ISK',
  'JPY',
  'KRW',
  'MMK',
  'MXN',
  'MYR',
  'NZD',
  'PHP',
  'PKR',
  'PLN',
  'RON',
  'RUB',
  'SEK',
  'SGD',
  'THB',
  'TRY',
  'TWD',
  'TWI',
  'USD',
  'VND',
  'XDR',
  'ZAR'
] as const;
export type ExchangeBaseCurrency = (typeof exchangeBaseCurrencies)[number];

export const exchangeBaseCurrencyNames: Record<ExchangeBaseCurrency, string> = {
  AUD: 'Australian dollar',
  BDT: 'Bangladeshi taka',
  BGN: 'Bulgarian lev',
  BRL: 'Brazilian real',
  BYN: 'Belarusian new rouble',
  CAD: 'Canadian dollar',
  CHF: 'Swiss franc',
  CNY: 'Chinese yuan',
  CZK: 'Czech koruna',
  DKK: 'Danish krone',
  EUR: 'Euro',
  GBP: 'Pound sterling',
  HKD: 'Hong Kong dollar',
  HRK: 'Croatian kuna',
  HUF: 'Hungarian forint',
  I44: 'Import-weighted krone exchange rate',
  IDR: 'Indonesian rupiah',
  ILS: 'Israeli new shekel',
  INR: 'Indian rupee',
  ISK: 'Icelandic krona',
  JPY: 'Japanese yen',
  KRW: 'South Korean won',
  MMK: 'Myanmar kyat',
  MXN: 'Mexican peso',
  MYR: 'Malaysian ringgit',
  NZD: 'New Zealand dollar',
  PHP: 'Philippine peso',
  PKR: 'Pakistani rupee',
  PLN: 'Polish zloty',
  RON: 'New Romanian leu',
  RUB: 'Russian rouble',
  SEK: 'Swedish krona',
  SGD: 'Singapore dollar',
  THB: 'Thai baht',
  TRY: 'Turkish lira',
  TWD: 'New Taiwan dollar',
  TWI: 'Trade-weighted krone exchange rate',
  USD: 'US dollar',
  VND: 'Vietnamese dong',
  XDR: 'IMF, special drawing rights',
  ZAR: 'South African rand'
};

export const genericTenors = ['3M', '6M', '12M', '3Y', '5Y', '7Y', '10Y'] as const;
export type GenericTenor = (typeof genericTenors)[number];

export const genericTenorNames: Record<GenericTenor, string> = {
  '3M': '3 months',
  '6M': '6 months',
  '12M': '12 months',
  '3Y': '3 years',
  '5Y': '5 years',
  '7Y': '7 years',
  '10Y': '10 years'
};

export const genericInstrumentTypes = ['TBIL', 'GBON'] as const;
export type GenericInstrumentType = (typeof genericInstrumentTypes)[number];

export const genericInstrumentTypeNames: Record<GenericInstrumentType, string> = {
  TBIL: 'Treasury bills',
  GBON: 'Government bonds'
};

export const localeValues = ['en', 'no'] as const;
export type NorgesBankLocale = (typeof localeValues)[number];

export const frequencySchema = z.enum(frequencies);
export const exchangeBaseCurrencySchema = z.enum(exchangeBaseCurrencies);
export const genericTenorSchema = z.enum(genericTenors);
export const genericInstrumentTypeSchema = z.enum(genericInstrumentTypes);
export const localeSchema = z.enum(localeValues);

let exchangeBaseCurrencySet = new Set<string>(exchangeBaseCurrencies);
let genericTenorSet = new Set<string>(genericTenors);
let genericInstrumentTypeSet = new Set<string>(genericInstrumentTypes);

let allowedGenericTenorsByInstrument: Record<GenericInstrumentType, readonly GenericTenor[]> =
  {
    TBIL: ['3M', '6M', '12M'],
    GBON: ['3Y', '5Y', '7Y', '10Y']
  };

let periodFormats: Record<Frequency, { pattern: RegExp; example: string; label: string }> = {
  B: {
    pattern: /^\d{4}-\d{2}-\d{2}$/,
    example: '2025-05-12',
    label: 'business-day'
  },
  M: {
    pattern: /^\d{4}-\d{2}$/,
    example: '2025-05',
    label: 'monthly'
  },
  A: {
    pattern: /^\d{4}$/,
    example: '2025',
    label: 'annual'
  }
};

let formatList = (values: readonly string[]) => values.join(', ');

export let isExchangeBaseCurrency = (value: string): value is ExchangeBaseCurrency =>
  exchangeBaseCurrencySet.has(value);

export let isGenericTenor = (value: string): value is GenericTenor =>
  genericTenorSet.has(value);

export let isGenericInstrumentType = (value: string): value is GenericInstrumentType =>
  genericInstrumentTypeSet.has(value);

export let getFrequencyName = (code: string) =>
  code === 'B' || code === 'M' || code === 'A' ? frequencyNames[code] : code;

export let getExchangeBaseCurrencyName = (code: string) =>
  isExchangeBaseCurrency(code) ? exchangeBaseCurrencyNames[code] : code;

export let getGenericTenorName = (code: string) =>
  isGenericTenor(code) ? genericTenorNames[code] : code;

export let getGenericInstrumentTypeName = (code: string) =>
  isGenericInstrumentType(code) ? genericInstrumentTypeNames[code] : code;

export let uniqueValues = <T extends string>(values: readonly T[]) => [...new Set(values)];

export let validatePeriodRange = (
  frequency: Frequency,
  startPeriod: string,
  endPeriod: string
) => {
  let format = periodFormats[frequency];

  for (let [label, value] of [
    ['startPeriod', startPeriod],
    ['endPeriod', endPeriod]
  ] as const) {
    if (!format.pattern.test(value)) {
      throw norgesBankServiceError(
        `${label} must be a ${format.label} period in the form ${format.example} for frequency ${frequency}.`
      );
    }
  }

  if (startPeriod > endPeriod) {
    throw norgesBankServiceError('startPeriod must be less than or equal to endPeriod.');
  }
};

export let validateGenericRateCombinations = (
  tenors: readonly GenericTenor[],
  instrumentTypes: readonly GenericInstrumentType[]
) => {
  for (let instrumentType of instrumentTypes) {
    let allowed = allowedGenericTenorsByInstrument[instrumentType];
    let invalidTenors = tenors.filter(tenor => !allowed.includes(tenor));

    if (invalidTenors.length > 0) {
      throw norgesBankServiceError(
        `${instrumentType} supports only ${formatList(allowed)} tenors. Invalid tenor selections: ${formatList(invalidTenors)}. Use separate calls for treasury bills and government bonds.`
      );
    }
  }
};
