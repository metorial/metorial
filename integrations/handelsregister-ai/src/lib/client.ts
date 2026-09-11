import {
  createApiServiceError,
  createAuthenticatedAxios,
  getResponseHeaderValue,
  isApiErrorRecord,
  pickDefined,
  requestAxios
} from 'slates';
import type { z } from 'zod';
import { API_BASE_URL, MAX_FILE_BYTES, REQUEST_TIMEOUT_MS } from './constants';
import { handelsregisterError } from './errors';
import { parseResponse } from './response';
import {
  accountOutputSchema,
  accountSchema,
  type companyInputSchema,
  type documentInputSchema,
  metaSchema,
  recordSchema,
  type searchInputSchema
} from './schemas';

export type HandelsregisterAuth = { token: string };

export const mapAccount = (value: unknown) => {
  let envelope = parseResponse(recordSchema, value);
  let account = parseResponse(
    accountSchema,
    isApiErrorRecord(envelope.account) ? envelope.account : envelope
  );
  return parseResponse(accountOutputSchema, { account, meta: envelope.meta });
};

export class HandelsregisterClient {
  private http: ReturnType<typeof createAuthenticatedAxios>;
  constructor(auth: HandelsregisterAuth) {
    this.http = createAuthenticatedAxios({
      baseURL: API_BASE_URL,
      authHeader: { name: 'x-api-key', value: auth.token },
      headers: { Accept: 'application/json' },
      timeout: REQUEST_TIMEOUT_MS,
      maxContentLength: MAX_FILE_BYTES,
      maxRedirects: 0,
      validateStatus: () => true
    });
  }

  private async request(path: string, params?: Record<string, unknown>, binary = false) {
    let response = await requestAxios(
      path,
      () =>
        this.http.get<unknown>(path, {
          params,
          ...(binary
            ? {
                responseType: 'arraybuffer' as const,
                headers: { Accept: 'application/pdf, application/xml, application/json' }
              }
            : {})
        }),
      handelsregisterError
    );
    if (response.status < 200 || response.status >= 300) {
      throw handelsregisterError({ response: { status: response.status } }, path);
    }
    return response;
  }

  async organization(input: z.infer<typeof companyInputSchema>, feature?: string) {
    if (input.realtime_mode && (feature === 'related_persons' || feature === 'publications')) {
      throw createApiServiceError(
        'Realtime mode cannot be combined with related persons or publications. Omit realtime_mode.'
      );
    }
    return parseResponse(
      recordSchema,
      (
        await this.request(
          '/fetch-organization',
          pickDefined({
            ...input,
            feature,
            ai_search: feature === 'website_content' ? 'on-default' : input.ai_search
          })
        )
      ).data
    );
  }

  async search(input: z.infer<typeof searchInputSchema>) {
    if (!input.q && (!input.filters || Object.keys(input.filters).length === 0)) {
      throw createApiServiceError('Provide q or at least one search filter.');
    }
    let filters = input.filters;
    if (
      Boolean(filters?.location_coordinates) !==
      (filters?.location_max_distance_km !== undefined)
    ) {
      throw createApiServiceError(
        'Provide both location_coordinates and location_max_distance_km for radius searches.'
      );
    }
    if (input.sort === 'distance' && !filters?.location_coordinates) {
      throw createApiServiceError('Sorting by distance requires a radius-search location.');
    }
    if (
      filters?.registration_date_from &&
      filters.registration_date_to &&
      filters.registration_date_from > filters.registration_date_to
    ) {
      throw createApiServiceError(
        'registration_date_from must not be after registration_date_to.'
      );
    }
    for (let range of Object.values(filters?.financial_filters ?? {})) {
      if (
        isApiErrorRecord(range) &&
        typeof range.gte === 'number' &&
        typeof range.lte === 'number' &&
        range.gte > range.lte
      ) {
        throw createApiServiceError('A financial filter minimum must not exceed its maximum.');
      }
    }
    return (
      await this.request(
        '/search-organizations',
        pickDefined({
          ...input,
          filters: filters ? JSON.stringify(filters) : undefined,
          match_context:
            input.match_context === undefined ? undefined : input.match_context ? 1 : 0
        })
      )
    ).data;
  }

  async person(input: { person_q: string; organization_q: string; feature?: string[] }) {
    return (
      await this.request(
        '/fetch-person',
        pickDefined({
          person_q: input.person_q,
          organization_q: input.organization_q,
          features: input.feature?.join(',')
        })
      )
    ).data;
  }

  async account() {
    let response = await this.request('/account');
    return mapAccount(response.data);
  }

  async document(input: z.infer<typeof documentInputSchema>) {
    let response = await this.request('/fetch-document', input, true);
    let mimeType = getResponseHeaderValue(response.headers, 'content-type')
      ?.split(';')[0]
      ?.trim();
    let expectedMimeType =
      input.document_type === 'SI' ? 'application/xml' : 'application/pdf';
    if (
      mimeType !== expectedMimeType &&
      !(input.document_type === 'SI' && mimeType === 'text/xml')
    ) {
      throw createApiServiceError(
        'The document endpoint returned an unexpected file format. Request a fresh document.'
      );
    }
    let content = Buffer.isBuffer(response.data)
      ? response.data
      : response.data instanceof ArrayBuffer
        ? Buffer.from(response.data)
        : undefined;
    if (!content?.length)
      throw createApiServiceError('The provider returned an empty or invalid document.');
    if (
      expectedMimeType === 'application/pdf' &&
      content.subarray(0, 5).toString() !== '%PDF-'
    ) {
      throw createApiServiceError('The provider response was not a valid PDF document.');
    }
    return { content, mimeType: expectedMimeType };
  }
}

export const readMeta = (value: unknown) =>
  value === undefined ? undefined : parseResponse(metaSchema, value);
