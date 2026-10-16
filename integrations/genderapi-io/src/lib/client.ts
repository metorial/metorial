import { buildApiServiceError, createApiServiceError, createAxios } from 'slates';
import { z } from 'zod';
import {
  type PredictionInput,
  predictionBatchResponseSchema,
  predictionResponseSchema
} from './schemas';

let genderResultSchema = z.object({
  name: z.string(),
  q: z.string(),
  gender: z.string().nullable(),
  country: z.string(),
  total_names: z.number().int(),
  probability: z.number().int(),
  id: z.string().optional()
});
let singleResponseSchema = genderResultSchema.extend({
  status: z.literal(true),
  used_credits: z.number().int(),
  remaining_credits: z.number().int()
});
let bulkResponseSchema = z.object({
  status: z.literal(true),
  used_credits: z.number().int(),
  remaining_credits: z.number().int(),
  names: z.array(genderResultSchema)
});
let phoneResponseSchema = z.object({
  status: z.literal(true),
  regionCode: z.string(),
  countryCode: z.number().int(),
  country: z.string(),
  national: z.string(),
  international: z.string(),
  e164: z.string(),
  isValid: z.boolean(),
  isPossible: z.boolean(),
  numberType: z.string(),
  nationalSignificantNumber: z.string(),
  rawInput: z.string(),
  isGeographical: z.boolean(),
  areaCode: z.string(),
  location: z.string()
});
let usageResponseSchema = z.object({
  status: z.literal(true),
  remaining: z.number().int(),
  expiresAt: z.number().int().nonnegative()
});

let mapGenderResult = (data: z.infer<typeof genderResultSchema>) => ({
  name: data.name,
  q: data.q,
  gender: data.gender,
  country: data.country,
  totalNames: data.total_names,
  probability: data.probability,
  id: data.id
});
let mapSingleResponse = (data: z.infer<typeof singleResponseSchema>) => ({
  ...mapGenderResult(data),
  usedCredits: data.used_credits,
  remainingCredits: data.remaining_credits
});
let mapBulkResponse = (data: z.infer<typeof bulkResponseSchema>) => ({
  names: data.names.map(mapGenderResult),
  usedCredits: data.used_credits,
  remainingCredits: data.remaining_credits
});

export type GenderSingleResponse = ReturnType<typeof mapSingleResponse>;
export type GenderBulkResponse = ReturnType<typeof mapBulkResponse>;

export let requireText = (value: string, field: string) => {
  if (!value.trim()) throw createApiServiceError(`${field} must not be empty.`);
};

let toPredictionRequest = (input: PredictionInput, batch: boolean) => {
  let mode = input.aiMode ?? (batch ? 'off' : 'fallback');
  if (input.forceToGenderize && mode !== 'fallback') {
    throw createApiServiceError('forceToGenderize requires aiMode "fallback".');
  }
  return {
    type: input.type,
    value: input.value,
    ...(input.country !== undefined ? { country: input.country } : {}),
    ...(input.forceToGenderize !== undefined
      ? { forceToGenderize: input.forceToGenderize }
      : {}),
    ...(input.aiMode !== undefined ? { options: { ai_mode: input.aiMode } } : {})
  };
};

export class Client {
  private axios;

  constructor(config: { token: string }) {
    requireText(config.token, 'API key');
    this.axios = createAxios({
      baseURL: 'https://api.genderapi.io',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    schema: z.ZodType<T>,
    data?: unknown
  ): Promise<T> {
    try {
      let response = await this.axios.request<unknown>({ method, url: path, data });
      let body = response.data;
      if (body && typeof body === 'object' && 'status' in body && body.status === false) {
        throw buildApiServiceError(
          { response },
          {
            providerLabel: 'GenderAPI.io',
            reason: 'genderapi_request_failed',
            operation: path,
            detailKeys: ['errmsg', 'detail', 'message', 'title'],
            extractUpstreamCode: (_error, result) => {
              let value = result?.data;
              return value && typeof value === 'object' && 'errno' in value
                ? String(value.errno)
                : undefined;
            }
          }
        );
      }
      let result = schema.safeParse(body);
      if (!result.success) {
        throw createApiServiceError(`GenderAPI.io returned an invalid response for ${path}.`, {
          reason: 'genderapi_invalid_response'
        });
      }
      if (
        path.startsWith('/api/v2/') &&
        body &&
        typeof body === 'object' &&
        'meta' in body &&
        body.meta &&
        typeof body.meta === 'object' &&
        'access' in body.meta &&
        body.meta.access &&
        typeof body.meta.access === 'object' &&
        'mode' in body.meta.access &&
        body.meta.access.mode !== 'api_key'
      ) {
        throw createApiServiceError(
          'GenderAPI.io did not accept the saved API key. Reconnect with a valid API key. The request used trial access; inspect your balance before retrying.',
          { reason: 'genderapi_api_key_not_accepted' }
        );
      }
      return result.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'GenderAPI.io',
        reason: 'genderapi_request_failed',
        operation: path,
        detailKeys: ['errmsg', 'detail', 'message', 'title'],
        extractResponse: (failure, helpers) => helpers.getResponseWithBody(failure)
      });
    }
  }

  async detectGenderFromName(params: {
    name: string;
    country?: string;
    askToAI?: boolean;
    forceToGenderize?: boolean;
  }): Promise<GenderSingleResponse> {
    return mapSingleResponse(await this.request('POST', '/api', singleResponseSchema, params));
  }

  async detectGenderFromEmail(params: {
    email: string;
    country?: string;
    askToAI?: boolean;
  }): Promise<GenderSingleResponse> {
    return mapSingleResponse(
      await this.request('POST', '/api/email', singleResponseSchema, params)
    );
  }

  async detectGenderFromUsername(params: {
    username: string;
    country?: string;
    askToAI?: boolean;
    forceToGenderize?: boolean;
  }): Promise<GenderSingleResponse> {
    return mapSingleResponse(
      await this.request('POST', '/api/username', singleResponseSchema, params)
    );
  }

  async detectGenderFromNamesBulk(params: {
    data: Array<{ name: string; country?: string; id?: string }>;
  }): Promise<GenderBulkResponse> {
    return mapBulkResponse(
      await this.request('POST', '/api/name/multi/country', bulkResponseSchema, params)
    );
  }

  async detectGenderFromEmailsBulk(params: {
    data: Array<{ email: string; country?: string; id?: string }>;
  }): Promise<GenderBulkResponse> {
    return mapBulkResponse(
      await this.request('POST', '/api/email/multi/country', bulkResponseSchema, params)
    );
  }

  async detectGenderFromUsernamesBulk(params: {
    data: Array<{ username: string; country?: string; id?: string }>;
  }): Promise<GenderBulkResponse> {
    return mapBulkResponse(
      await this.request('POST', '/api/username/multi/country', bulkResponseSchema, params)
    );
  }

  async validatePhoneNumber(params: { number: string; address?: string }) {
    return this.request('POST', '/api/phone', phoneResponseSchema, params);
  }

  async getUsage() {
    return this.request('GET', '/api/remaining', usageResponseSchema);
  }

  async predictGender(input: PredictionInput) {
    return this.request(
      'POST',
      '/api/v2/gender',
      predictionResponseSchema,
      toPredictionRequest(input, false)
    );
  }

  async predictGenderBatch(items: Array<PredictionInput & { id?: string }>) {
    let result = await this.request(
      'POST',
      '/api/v2/gender/batch',
      predictionBatchResponseSchema,
      {
        items: items.map(item => ({
          ...toPredictionRequest(item, true),
          ...(item.id !== undefined ? { id: item.id } : {})
        }))
      }
    );
    if (
      result.data.length !== items.length ||
      result.data.some((item, index) => item.index !== index)
    ) {
      throw createApiServiceError('GenderAPI.io returned an invalid ordered batch response.', {
        reason: 'genderapi_invalid_response'
      });
    }
    return result;
  }
}
