import { createAuthenticatedAxios, isApiErrorRecord, requestAxios } from 'slates';
import { z } from 'zod';
import {
  exactId,
  invalidResponse,
  parseProviderJson,
  safeMoneybirdError,
  scrubResponse,
  validateToken
} from './validation';
export const administrationSchema = z.object({
  administrationId: z.string(),
  name: z.string(),
  currency: z.string(),
  language: z.string(),
  country: z.string(),
  timeZone: z.string(),
  access: z.string().optional(),
  suspended: z.boolean().optional(),
  periodLockedUntil: z.string().nullable().optional(),
  periodStartDate: z.string().optional()
});
export const listAdministrations = async (
  token: string
): Promise<z.infer<typeof administrationSchema>[]> => {
  validateToken(token);
  const http = createAuthenticatedAxios({
    baseURL: 'https://moneybird.com/api/v2',
    authHeader: { value: `Bearer ${token}` },
    timeout: 30000,
    maxRedirects: 0,
    transformResponse: [parseProviderJson],
    errorAdapter: safeMoneybirdError
  });
  const response = await requestAxios(
    'administration discovery',
    () => http.get('/administrations.json'),
    safeMoneybirdError
  );
  if (response.status !== 200)
    throw safeMoneybirdError({ response: { status: response.status } });
  const records = scrubResponse(response.data, token);
  if (!Array.isArray(records)) throw invalidResponse();
  return records.map(value => {
    if (!isApiErrorRecord(value)) throw invalidResponse();
    const parsed = administrationSchema.safeParse({
      administrationId: exactId(value.id),
      name: value.name,
      currency: value.currency,
      language: value.language,
      country: value.country,
      timeZone: value.time_zone,
      access: value.access,
      suspended: value.suspended,
      periodLockedUntil: value.period_locked_until,
      periodStartDate: value.period_start_date
    });
    if (!parsed.success) throw invalidResponse();
    return parsed.data;
  });
};
