import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  isApiErrorRecord,
  requestAxios
} from 'slates';
import { z } from 'zod';

export interface EmailValidationResult {
  email: string;
  didYouMean: string | null;
  user: string | null;
  domain: string | null;
  formatValid: boolean | null;
  mxFound: boolean | null;
  smtpCheck: boolean | null;
  catchAll: boolean | null;
  role: boolean | null;
  disposable: boolean | null;
  free: boolean | null;
  score: number | null;
}

let rawEmailResultSchema = z.object({
  email: z.string(),
  did_you_mean: z.string().nullish(),
  user: z.string().nullish(),
  domain: z.string().nullish(),
  format_valid: z.boolean().nullish(),
  mx_found: z.boolean().nullish(),
  smtp_check: z.boolean().nullish(),
  catch_all: z.boolean().nullish(),
  role: z.boolean().nullish(),
  disposable: z.boolean().nullish(),
  free: z.boolean().nullish(),
  score: z.number().nullish()
});

type RawEmailValidationResult = z.infer<typeof rawEmailResultSchema>;

let mapResult = (raw: RawEmailValidationResult): EmailValidationResult => ({
  email: raw.email,
  didYouMean: raw.did_you_mean ?? null,
  user: raw.user ?? null,
  domain: raw.domain ?? null,
  formatValid: raw.format_valid ?? null,
  mxFound: raw.mx_found ?? null,
  smtpCheck: raw.smtp_check ?? null,
  catchAll: raw.catch_all ?? null,
  role: raw.role ?? null,
  disposable: raw.disposable ?? null,
  free: raw.free ?? null,
  score: raw.score ?? null
});

export class Client {
  private api: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('A Mailboxlayer API Access Key is required.');
    }
    this.api = createAxios({
      baseURL: 'https://apilayer.net/api',
      params: {
        access_key: config.token
      },
      // Inspect HTTP failures before the shared interceptor discards the response body.
      validateStatus: () => true
    });
  }

  private async request(path: string, params: Record<string, string>): Promise<unknown> {
    let response = await requestAxios(
      path,
      () => this.api.get<unknown>(path, { params }),
      (error, operation) =>
        buildApiServiceError(error, {
          providerLabel: 'Mailboxlayer',
          reason: 'mailboxlayer_api_error',
          operation
        })
    );
    let data = response.data;
    if (response.status >= 400 || (isApiErrorRecord(data) && data.success === false)) {
      throw buildApiServiceError(
        { response },
        {
          providerLabel: 'Mailboxlayer',
          reason: 'mailboxlayer_api_error',
          operation: path,
          detailKeys: ['info', 'type', 'code', 'msg', 'message'],
          nestedKeys: ['error', 'detail'],
          fallbackMessage: 'The request was rejected.',
          extractUpstreamCode: () =>
            isApiErrorRecord(data) &&
            isApiErrorRecord(data.error) &&
            (typeof data.error.code === 'number' || typeof data.error.code === 'string')
              ? String(data.error.code)
              : undefined
        }
      );
    }
    return data;
  }

  async validateEmail(params: {
    email: string;
    smtp?: boolean;
    catchAll?: boolean;
  }): Promise<EmailValidationResult> {
    let queryParams: Record<string, string> = {
      email: params.email
    };

    if (params.smtp === false) {
      queryParams.smtp = '0';
    }

    if (params.catchAll === true) {
      queryParams.catch_all = '1';
    }

    let data = await this.request('/check', queryParams);
    let result = rawEmailResultSchema.safeParse(data);
    if (!result.success) {
      throw createApiServiceError('Mailboxlayer returned an invalid validation response.', {
        reason: 'mailboxlayer_invalid_response'
      });
    }
    return mapResult(result.data);
  }

  async bulkValidateEmails(params: {
    emails: string[];
    smtp?: boolean;
    catchAll?: boolean;
  }): Promise<EmailValidationResult[]> {
    let queryParams: Record<string, string> = {
      emails: params.emails.join(',')
    };

    if (params.smtp === false) {
      queryParams.smtp = '0';
    }

    if (params.catchAll === true) {
      queryParams.catch_all = '1';
    }

    let data = await this.request('/bulk_check', queryParams);
    let results = z.array(rawEmailResultSchema).safeParse(data);
    if (!results.success) {
      throw createApiServiceError(
        'Mailboxlayer returned an invalid bulk validation response.',
        {
          reason: 'mailboxlayer_invalid_response'
        }
      );
    }
    return results.data.map(mapResult);
  }
}
