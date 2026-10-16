import { createApiServiceError, isApiErrorRecord } from 'slates';
import type { z } from 'zod';

export let parseProviderOutput = <T>(
  schema: z.ZodType<T>,
  value: unknown,
  operation: string
): T => {
  let parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw createApiServiceError(`FraudLabs Pro returned an invalid ${operation} response.`);
  }
  return parsed.data;
};

// The v2 migration example documents nulls for unavailable values. Keep these
// in raw while preserving the original optional scalar contracts in the projection.
let documentedNulls: Record<string, readonly string[]> = {
  ip_geolocation: ['mobile_mnc', 'mobile_mcc', 'mobile_brand'],
  shipping_address: [
    'is_bill_country_match',
    'is_bill_state_match',
    'is_bill_city_match',
    'is_bill_postcode_match'
  ],
  phone_number: ['is_disposable', 'is_in_blacklist'],
  credit_card: [
    'card_brand',
    'card_type',
    'card_issuing_bank',
    'card_issuing_country',
    'is_prepaid',
    'is_bin_exist',
    'is_bin_country_match',
    'is_in_blacklist'
  ],
  device: ['is_in_blacklist']
};

export let screenDetails = (result: Record<string, unknown>, key: string) => {
  let value = result[key];
  if (value === undefined || value === null) return undefined;
  if (!isApiErrorRecord(value)) {
    throw createApiServiceError(`FraudLabs Pro returned invalid ${key} screening details.`);
  }
  let projected = Object.fromEntries(
    Object.entries(value).filter(
      ([field, item]) => item !== null || !(documentedNulls[key] ?? []).includes(field)
    )
  );
  if (key === 'ip_geolocation' && Array.isArray(projected.usage_type)) {
    let { usage_type, ...details } = projected;
    return { ...details, usage_types: usage_type };
  }
  return projected;
};
