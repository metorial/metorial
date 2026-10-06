import { createApiServiceError, pickDefined } from 'slates';

type Location = {
  cities?: string[];
  states?: string[];
  countries?: string[];
  countryCode2s?: string[];
};
type Range = { min?: number; max?: number };
type Dates = { start?: string; end?: string };
type Funding = {
  fundingRoundsMin?: number;
  fundingRoundsMax?: number;
  fundingTotalUsdMin?: number;
  fundingTotalUsdMax?: number;
  lastFundingTypes?: string[];
  lastFundingRange?: Range;
  lastFundingDateRange?: Dates;
};
type Contact = {
  names?: string[];
  titles?: string[];
  seniorities?: string[];
  roles?: string[];
  locations?: Location;
  containsWorkEmails?: string[];
  updatedAt?: Dates;
  newHireFrom?: string;
  newPromotionFrom?: string;
};
type Company = {
  names?: string[];
  domains?: string[];
  industries?: string[];
  sizes?: Range[];
  locations?: Location;
  descriptions?: string[];
  technologies?: string[];
  technologyCategories?: string[];
  revenueRanges?: Range[];
  fundingInfoFilters?: Funding[];
  naicsCodeFilters?: string[];
  sicCodeFilters?: string[];
};

export function mapLocations(value: Location | undefined) {
  if (!value) return undefined;
  let countries = [...(value.countries ?? [])];
  let names = new Intl.DisplayNames(['en'], { type: 'region', fallback: 'none' });
  for (let code of value.countryCode2s ?? []) {
    let name = /^[a-z]{2}$/i.test(code) ? names.of(code.toUpperCase()) : undefined;
    if (!name)
      throw createApiServiceError(
        'countryCode2s must contain valid ISO two-letter country codes.',
        { reason: 'invalid_input' }
      );
    countries.push(name);
  }
  let cities: (string | undefined)[] = value.cities?.length ? value.cities : [undefined];
  let states: (string | undefined)[] = value.states?.length ? value.states : [undefined];
  let countryValues: (string | undefined)[] = countries.length
    ? [...new Set(countries)]
    : [undefined];
  if (cities.length * states.length * countryValues.length > 100)
    throw createApiServiceError(
      'Narrow location filters to at most 100 city/state/country combinations.',
      { reason: 'invalid_input' }
    );
  return cities.flatMap(city =>
    states.flatMap(areaLevel1 =>
      countryValues.map(country => pickDefined({ city, areaLevel1, country }))
    )
  );
}

function timestamp(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (
    !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value) ||
    (value.includes('T') && !/(?:Z|[+-]\d{2}:\d{2})$/.test(value))
  )
    throw createApiServiceError(
      'Date filters must be ISO dates, or ISO timestamps with an explicit timezone.',
      { reason: 'invalid_input' }
    );
  let result = Date.parse(value);
  if (
    value.length === 10 &&
    Number.isFinite(result) &&
    new Date(result).toISOString().slice(0, 10) !== value
  )
    throw createApiServiceError('Date filter contains an invalid calendar date.', {
      reason: 'invalid_input'
    });
  if (!Number.isSafeInteger(result))
    throw createApiServiceError('Date filters must contain valid ISO dates or timestamps.', {
      reason: 'invalid_input'
    });
  return result;
}
function dates(value: Dates | undefined) {
  if (!value) return undefined;
  let start = timestamp(value.start),
    end = timestamp(value.end);
  if (start !== undefined && end !== undefined && start > end)
    throw createApiServiceError('Date-filter start must not be after end.', {
      reason: 'invalid_input'
    });
  return pickDefined({ start, end });
}
function range(value: Range) {
  for (let item of [value.min, value.max])
    if (item !== undefined && (!Number.isSafeInteger(item) || item < 0))
      throw createApiServiceError('Range bounds must be non-negative safe integers.', {
        reason: 'invalid_input'
      });
  if (value.min !== undefined && value.max !== undefined && value.min > value.max)
    throw createApiServiceError('Range minimum must not exceed maximum.', {
      reason: 'invalid_input'
    });
  return pickDefined({ start: value.min, end: value.max });
}
export function mapContactFilter(value: Contact | undefined) {
  if (!value) return undefined;
  return pickDefined({
    ...value,
    locations: mapLocations(value.locations),
    updatedAt: dates(value.updatedAt),
    newHireFrom: timestamp(value.newHireFrom),
    newPromotionFrom: timestamp(value.newPromotionFrom)
  });
}
export function mapCompanyFilter(value: Company | undefined) {
  if (!value) return undefined;
  if (value.descriptions?.length)
    throw createApiServiceError(
      'The current CompanyFilter does not document descriptions. Remove descriptions and use supported names, domains, industries or technology filters; this legacy input remains available for compatibility.',
      { reason: 'unsupported_input' }
    );
  let fundingInfoFilters = value.fundingInfoFilters?.map(funding => {
    if (
      funding.fundingRoundsMin !== undefined ||
      funding.fundingRoundsMax !== undefined ||
      funding.lastFundingTypes?.length
    )
      throw createApiServiceError(
        'The current funding filter supports totalFundingRange, lastFundingRange and lastFundingDateRange, but does not document round-count or funding-type filters. Remove fundingRoundsMin/fundingRoundsMax/lastFundingTypes and use supported range filters.',
        { reason: 'unsupported_input' }
      );
    return pickDefined({
      totalFundingRange:
        funding.fundingTotalUsdMin !== undefined || funding.fundingTotalUsdMax !== undefined
          ? range({ min: funding.fundingTotalUsdMin, max: funding.fundingTotalUsdMax })
          : undefined,
      lastFundingRange: funding.lastFundingRange ? range(funding.lastFundingRange) : undefined,
      lastFundingDateRange: dates(funding.lastFundingDateRange)
    });
  });
  for (let size of value.sizes ?? []) range(size);
  return pickDefined({
    ...value,
    descriptions: undefined,
    locations: mapLocations(value.locations),
    revenueRanges: value.revenueRanges?.map(range),
    fundingInfoFilters,
    naicsCodeFilters: value.naicsCodeFilters?.map(code => ({ code })),
    sicCodeFilters: value.sicCodeFilters?.map(code => ({ code }))
  });
}
