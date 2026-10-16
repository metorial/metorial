import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';
import { z } from 'zod';
import {
  coverageSchema,
  creditsSchema,
  currentCarrierSchema,
  exampleResponseSchema,
  uploadResultSchema,
  uploadSchema,
  verificationResponseSchema
} from './schemas';

export interface VerifyParams {
  phone: string;
  defaultCountry?: string;
}

export interface VerifyResponse {
  status: string;
  phone: string;
  phoneValid: boolean;
  phoneType: string | null;
  phoneRegion: string | null;
  country: string | null;
  countryCode: string | null;
  countryPrefix: string | null;
  internationalNumber: string | null;
  localNumber: string | null;
  e164: string | null;
  carrier: string | null;
}

export interface ExampleParams {
  countryCode?: string;
  phoneType?: string;
}

export interface ExampleResponse {
  status: string;
  phoneType: string;
  countryCode: string;
  countryPrefix: string;
  internationalNumber: string;
  localNumber: string;
  e164: string;
}

export class Client {
  private http: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('A Veriphone API key is required. Reconnect your account.');
    }
    this.http = createAxios({
      baseURL: 'https://api.veriphone.io',
      headers: { Authorization: `Bearer ${config.token}` }
    });
  }

  private async request<T extends z.ZodType>(
    method: 'get' | 'post',
    path: string,
    schema: T,
    params?: Record<string, string | number | boolean | undefined>,
    data?: FormData,
    allowInvalidPhone = false
  ): Promise<z.output<T>> {
    try {
      let response = await this.http.request({
        method,
        url: path,
        params: params ? pickDefined(params) : undefined,
        data
      });
      let body: unknown = response.data;
      if (
        isApiErrorRecord(body) &&
        (body.result === 'error' ||
          (body.status === 'error' &&
            !(
              allowInvalidPhone &&
              body.phone_valid === false &&
              typeof body.phone === 'string' &&
              body.code === undefined
            )))
      ) {
        throw buildApiServiceError(
          {
            response: {
              status: typeof body.code === 'number' ? body.code : response.status,
              data: body
            }
          },
          {
            providerLabel: 'Veriphone',
            reason: 'veriphone_api_error',
            operation: path,
            detailKeys: ['message', 'type', 'code', 'status', 'result']
          }
        );
      }
      let parsed = schema.safeParse(body);
      if (!parsed.success) {
        throw createApiServiceError(`Veriphone returned an invalid response for ${path}.`, {
          reason: 'veriphone_invalid_response',
          upstreamStatus: response.status
        });
      }
      return parsed.data;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Veriphone',
        reason: 'veriphone_api_error',
        operation: path,
        extractResponse: (input, helpers) => helpers.getResponseWithBody(input),
        detailKeys: ['message', 'type', 'code'],
        extractUpstreamCode: (_error, response) =>
          isApiErrorRecord(response?.data) &&
          (typeof response.data.code === 'string' || typeof response.data.code === 'number')
            ? String(response.data.code)
            : undefined
      });
    }
  }

  async verifyPhone(params: VerifyParams): Promise<VerifyResponse> {
    let queryParams: Record<string, string> = {
      phone: params.phone
    };

    if (params.defaultCountry) {
      queryParams.default_country = params.defaultCountry;
    }

    let data = await this.request(
      'get',
      '/v2/verify',
      verificationResponseSchema,
      queryParams,
      undefined,
      true
    );

    return {
      status: data.status,
      phone: data.phone,
      phoneValid: data.phone_valid,
      phoneType: data.phone_type,
      phoneRegion: data.phone_region,
      country: data.country,
      countryCode: data.country_code,
      countryPrefix: data.country_prefix,
      internationalNumber: data.international_number,
      localNumber: data.local_number,
      e164: data.e164,
      carrier: data.carrier
    };
  }

  async getExamplePhone(params: ExampleParams): Promise<ExampleResponse> {
    let queryParams: Record<string, string> = {};

    if (params.countryCode) {
      queryParams.country_code = params.countryCode;
    }

    if (params.phoneType) {
      queryParams.type = params.phoneType;
    }

    let data = await this.request('get', '/v2/example', exampleResponseSchema, queryParams);

    return {
      status: data.status,
      phoneType: data.phone_type,
      countryCode: data.country_code,
      countryPrefix: data.country_prefix,
      internationalNumber: data.international_number,
      localNumber: data.local_number,
      e164: data.e164
    };
  }

  getCredits() {
    return this.request('get', '/v3/credits', creditsSchema);
  }

  getCurrentCoverage() {
    return this.request('get', '/v3/coverage/current', coverageSchema);
  }

  lookupCurrentCarrier(params: VerifyParams) {
    return this.request('get', '/v3/verify', currentCarrierSchema, {
      phone: params.phone,
      default_country: params.defaultCountry,
      mode: 'current'
    });
  }

  uploadBulkFile(params: {
    csvContent: string;
    fileName: string;
    column: number;
    firstRow: number;
  }) {
    for (let [field, value] of [
      ['column', params.column],
      ['firstRow', params.firstRow]
    ] as const) {
      if (!Number.isSafeInteger(value) || value < 0) {
        throw createApiServiceError(`${field} must be a non-negative whole-number index.`);
      }
    }
    if (!params.fileName.toLowerCase().endsWith('.csv')) {
      throw createApiServiceError('The filename must end with .csv.');
    }
    let file = new Blob([params.csvContent], { type: 'text/csv' });
    if (!file.size || file.size > 100_000_000) {
      throw createApiServiceError('Provide a non-empty CSV file of at most 100 MB.');
    }
    let form = new FormData();
    form.append('file', file, params.fileName);
    form.append('column', String(params.column));
    form.append('firstrow', String(params.firstRow));
    return this.request('post', '/v3/file/upload', uploadResultSchema, undefined, form);
  }

  startBulkVerification(params: {
    id: string;
    defaultCountry?: string;
    mode?: 'static' | 'current';
  }) {
    return this.request(
      'post',
      '/v3/file/verify',
      z.looseObject({ status: z.literal('success'), id: z.string() }),
      {
        id: params.id,
        default_country: params.defaultCountry,
        mode: params.mode
      }
    );
  }

  listBulkFiles() {
    return this.request(
      'get',
      '/v3/file/list',
      z.looseObject({ status: z.literal('success'), uploads: z.array(uploadSchema) })
    );
  }

  async getBulkFile(id: string) {
    let file = await this.request('get', '/v3/file/get', uploadSchema.partial(), { id });
    if (
      Object.keys(file).length &&
      (!file.id || typeof file.name !== 'string' || typeof file.status !== 'string')
    ) {
      throw createApiServiceError(
        'Veriphone returned incomplete metadata for the bulk CSV upload.',
        {
          reason: 'veriphone_invalid_response'
        }
      );
    }
    return file;
  }

  getBulkStatus(id: string) {
    return this.request(
      'get',
      '/v3/file/status',
      z.looseObject({ id: z.string().optional(), status: z.string() }),
      { id }
    );
  }

  deleteBulkFile(id: string) {
    return this.request(
      'post',
      '/v3/file/delete',
      z.looseObject({ status: z.literal('success') }),
      { id }
    );
  }
}
