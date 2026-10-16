import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';
import { z } from 'zod';
import {
  type cancellationListInput,
  cancellationPageSchema,
  categoryListSchema,
  type coinListInput,
  coinPageSchema,
  coinV2Schema,
  type eventListInput,
  eventPageSchema,
  eventV2Schema,
  usageSchema
} from './v2-schemas';

// V1 remains isolated in client.ts so saved legacy calls retain their routes and contracts.
export class V2Client {
  private http;

  constructor(token: string) {
    if (!token.trim()) {
      throw createApiServiceError(
        'Provide a CoinMarketCal V2 API key from the developer dashboard.',
        { reason: 'coinmarketcal_missing_api_key' }
      );
    }
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.coinmarketcal.com/v2',
      timeout: 30_000,
      authHeader: { name: 'x-api-key', value: token },
      headers: { Accept: 'application/json' },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'CoinMarketCal',
          reason: 'coinmarketcal_api_error',
          extractResponse: (failure, helpers) => helpers.getResponseWithBody(failure),
          parent: {}
        })
    });
  }

  private async get<T>(path: string, schema: z.ZodType<T>, params?: Record<string, unknown>) {
    const response = await this.http.get<unknown>(path, { params });
    const result = schema.safeParse(response.data);
    if (!result.success) {
      throw createApiServiceError(
        `CoinMarketCal returned an unexpected response for ${path}.`,
        { reason: 'coinmarketcal_invalid_response' }
      );
    }
    return result.data;
  }

  private validateLimit(limit: number | undefined, maximum: number) {
    if (
      limit !== undefined &&
      (!Number.isSafeInteger(limit) || limit < 1 || limit > maximum)
    ) {
      throw createApiServiceError(`limit must be a whole number between 1 and ${maximum}.`);
    }
  }

  private validateDate(value: string | undefined, name: string) {
    if (
      value !== undefined &&
      !z.iso.date().safeParse(value).success &&
      !z.iso.datetime({ offset: true }).safeParse(value).success
    ) {
      throw createApiServiceError(`${name} must be an ISO-8601 date or timestamp.`);
    }
  }

  listEvents(params: z.infer<typeof eventListInput>) {
    this.validateLimit(params.limit, 100);
    this.validateDate(params.from, 'from');
    this.validateDate(params.to, 'to');
    if (
      params.from !== undefined &&
      params.to !== undefined &&
      Date.parse(params.from) > Date.parse(params.to)
    ) {
      throw createApiServiceError('from must be at or before to.');
    }
    if (
      params.impactMin !== undefined &&
      (!Number.isFinite(params.impactMin) || params.impactMin < 0 || params.impactMin > 10)
    ) {
      throw createApiServiceError('impactMin must be between 0 and 10.');
    }
    return this.get('/events', eventPageSchema, pickDefined(params));
  }

  getEvent(id: string) {
    if (!id.trim()) throw createApiServiceError('Provide an event ID from list_events.');
    return this.get(`/events/${encodeURIComponent(id)}`, eventV2Schema);
  }

  listCoins(params: z.infer<typeof coinListInput>) {
    this.validateLimit(params.limit, 200);
    return this.get('/coins', coinPageSchema, pickDefined(params));
  }

  getCoin(slug: string) {
    if (!slug.trim()) throw createApiServiceError('Provide a coin slug from search_coins.');
    return this.get(`/coins/${encodeURIComponent(slug)}`, coinV2Schema);
  }

  listCategories() {
    return this.get('/categories', categoryListSchema);
  }

  getUsage() {
    return this.get('/usage', usageSchema);
  }

  listCancellations(params: z.infer<typeof cancellationListInput>) {
    this.validateLimit(params.limit, 100);
    this.validateDate(params.since, 'since');
    return this.get('/events/cancellations', cancellationPageSchema, pickDefined(params));
  }
}
