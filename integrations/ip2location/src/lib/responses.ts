import { createApiServiceError } from 'slates';
import { z } from 'zod';

// Preserve the legacy scalar contracts; unavailable plan-specific data remains in providerData.
export let geolocationResponseSchema = z
  .object({
    country_code: z.string(),
    country_name: z.string(),
    region_name: z.string(),
    city_name: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    zip_code: z.string(),
    time_zone: z.string(),
    asn: z.string(),
    as: z.string(),
    is_proxy: z.boolean()
  })
  .passthrough();

export let parseResponse = <T extends z.ZodType>(
  schema: T,
  value: unknown,
  operation: string
): z.output<T> => {
  let parsed = schema.safeParse(value);
  if (!parsed.success) {
    let fields = parsed.error.issues
      .map(issue => issue.path.join('.') || 'response')
      .join(', ');
    throw createApiServiceError(
      `IP2Location returned malformed ${operation} data (${fields}). Retry the lookup or check your plan's data availability.`,
      {
        reason: 'invalid_provider_response'
      }
    );
  }
  return parsed.data;
};

export let mapGeolocation = (value: unknown) => {
  let data = parseResponse(geolocationResponseSchema, value, 'geolocation');
  return {
    countryCode: data.country_code,
    countryName: data.country_name,
    regionName: data.region_name,
    cityName: data.city_name,
    latitude: data.latitude,
    longitude: data.longitude,
    zipCode: data.zip_code,
    timeZone: data.time_zone,
    asn: data.asn,
    asName: data.as,
    isProxy: data.is_proxy
  };
};

export let providerDataSchema = z
  .record(z.string(), z.unknown())
  .optional()
  .describe(
    'Complete provider response, including plan-specific fields and unavailable values.'
  );
