import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';
import { z } from 'zod';

export interface VerifyEmailResult {
  status: string;
}

export interface EnrichEmailResult {
  fullName: string | null;
  gender: string | null;
  esp: string | null;
  free: boolean | null;
  noreply: boolean | null;
  status: string;
  email: string;
}

export interface FindEmailContact {
  email: string;
  confidence: string;
  result?: string;
}

export interface BulkUploadResult {
  fileId: string;
}

export interface BulkFileStatus {
  fileId: string;
  filename: string;
  unique: string;
  lines: string;
  linesProcessed: string;
  status: string;
  timestamp: string;
  linkAll: string;
  linkOk: string;
}

let creditSchema = z.object({
  onDemand: z.object({ available: z.number() }),
  subscription: z.object({ available: z.number(), expiresAt: z.string() }).nullable()
});

let disposableSchema = z.object({
  domain: z.string(),
  result: z.string(),
  internalResult: z.string().nullable(),
  mxServer: z.string().nullable(),
  mxServerIp: z.string().nullable()
});

let contactSchema = z.array(
  z.object({ email: z.string(), confidence: z.string(), result: z.string().optional() })
);

let apiErrors: Record<string, string> = {
  error_credit: 'Insufficient credits. Add credits before retrying.',
  no_credit: 'Insufficient credits. Add credits before retrying.',
  cannot_upload_file: 'The file could not be uploaded. Check its format and contents.',
  key_not_valid: 'The API key is invalid. Reconnect with a valid API key.',
  'missing parameters': 'Required request parameters are missing.',
  error_file_not_exists: 'The file does not exist under this account.'
};

let nullableString = (value: unknown) => (typeof value === 'string' ? value : null);
let nullableBoolean = (value: unknown) => (typeof value === 'boolean' ? value : null);

export class Client {
  private http: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('An EmailListVerify API key is required.');
    }
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.emaillistverify.com/api',
      authHeader: { name: 'x-api-key', value: config.token },
      contentType: false,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'EmailListVerify',
          reason: 'emaillistverify_api_error'
        })
    });
  }

  private async request(
    method: 'GET' | 'POST',
    path: string,
    data?: Record<string, unknown> | FormData,
    params?: Record<string, unknown>
  ): Promise<unknown> {
    let response = await this.http.request({ method, url: path, data, params });
    let result: unknown = response.data;
    if (typeof result === 'string') {
      let text = result.trim();
      result = text;
      try {
        result = JSON.parse(text);
      } catch {
        // Verification, upload, and compatibility endpoints also return plain text.
      }
    }
    if (typeof result === 'string' && Object.hasOwn(apiErrors, result)) {
      throw createApiServiceError(`EmailListVerify: ${apiErrors[result]}`, {
        upstreamCode: result,
        reason: 'emaillistverify_api_error'
      });
    }
    if (isApiErrorRecord(result) && (result.error || Number(result.statusCode) >= 400)) {
      throw createApiServiceError(
        `EmailListVerify: ${nullableString(result.message) ?? 'The request was rejected.'}`,
        {
          reason: 'emaillistverify_api_error',
          upstreamCode: nullableString(result.error) ?? undefined
        }
      );
    }
    return result;
  }

  async verifyEmail(email: string, timeout?: number): Promise<VerifyEmailResult> {
    let result = await this.request(
      'GET',
      '/verifyEmail',
      undefined,
      pickDefined({ email, timeout })
    );
    if (typeof result !== 'string' || !result) {
      throw createApiServiceError(
        'EmailListVerify returned an invalid verification response.'
      );
    }
    return { status: result };
  }

  async verifyEmailDetailed(email: string, timeout?: number): Promise<EnrichEmailResult> {
    let result = await this.request(
      'GET',
      '/verifyEmailDetailed',
      undefined,
      pickDefined({ email, timeout })
    );
    if (!isApiErrorRecord(result) || typeof (result.result ?? result.status) !== 'string') {
      throw createApiServiceError('EmailListVerify returned an invalid enrichment response.');
    }
    let fullName = [nullableString(result.firstName), nullableString(result.lastName)]
      .filter(Boolean)
      .join(' ');
    return {
      email: nullableString(result.email) ?? email,
      status: String(result.result ?? result.status),
      fullName: nullableString(result.fullName ?? result.full_name) ?? (fullName || null),
      gender: nullableString(result.gender),
      esp: nullableString(result.esp ?? result.ESP),
      free: nullableBoolean(result.isFree ?? result.free),
      noreply: nullableBoolean(result.isNoReply ?? result.noreply ?? result.no_reply)
    };
  }

  async findEmail(params: {
    firstName?: string;
    lastName?: string;
    domain: string;
  }): Promise<FindEmailContact[]> {
    let result = await this.request('POST', '/findContact', pickDefined(params));
    let parsed = contactSchema.safeParse(result);
    if (!parsed.success) {
      throw createApiServiceError(
        'EmailListVerify returned an invalid contact-search response.'
      );
    }
    return parsed.data;
  }

  async domainSearch(domain: string): Promise<FindEmailContact[]> {
    return this.findEmail({ domain });
  }

  async uploadBulkFile(
    filename: string,
    fileContents: string,
    quality?: 'standard' | 'high',
    deepScan?: boolean
  ): Promise<BulkUploadResult> {
    let formData = new FormData();
    formData.append(
      'file_contents',
      new Blob([fileContents], { type: 'text/plain' }),
      filename
    );
    if (quality !== undefined) formData.append('quality', quality);
    if (deepScan !== undefined) formData.append('deepScan', String(deepScan));
    let result = await this.request('POST', '/verifyApiFile', formData);
    if (
      (typeof result !== 'string' && typeof result !== 'number') ||
      !/^\d+$/.test(String(result))
    ) {
      throw createApiServiceError(
        'EmailListVerify returned an invalid bulk verification job ID.'
      );
    }
    return { fileId: String(result) };
  }

  async getBulkFileStatus(fileId: string): Promise<BulkFileStatus> {
    // Keep the compatibility endpoint because it supplies the existing line-count output fields.
    let result = await this.request('GET', '/getApiFileInfo', undefined, { id: fileId });
    if (typeof result !== 'string') {
      throw createApiServiceError('EmailListVerify returned an invalid bulk status response.');
    }
    if (result === 'waiting' || result === 'errored') {
      return {
        fileId,
        filename: '',
        unique: '',
        lines: '',
        linesProcessed: '',
        status: result,
        timestamp: '',
        linkAll: '',
        linkOk: ''
      };
    }
    let parts = result.replace(/^\|/, '').split('|');
    if (parts.length < 9 || parts[0] !== fileId) {
      throw createApiServiceError('EmailListVerify returned an invalid bulk status response.');
    }
    let finished = parts[5] === 'finished';
    // Never expose secret query values returned by the compatibility endpoint.
    let url = `https://api.emaillistverify.com/api/maillists/${encodeURIComponent(fileId)}`;
    return {
      fileId: parts[0] ?? fileId,
      filename: parts[1] ?? '',
      unique: parts[2] ?? '',
      lines: parts[3] ?? '0',
      linesProcessed: parts[4] ?? '0',
      status: parts[5] ?? 'unknown',
      timestamp: parts[6] ?? '',
      linkAll: finished ? `${url}?format=csv&addDuplicates=true&addNoEmailRows=true` : '',
      linkOk: finished ? `${url}?format=csv&results=ok` : ''
    };
  }

  async getBulkProgress(fileId: string) {
    let result = await this.request(
      'GET',
      `/maillists/${encodeURIComponent(fileId)}/progress`
    );
    let parsed = z.object({ status: z.string(), name: z.string() }).safeParse(result);
    if (!parsed.success) {
      throw createApiServiceError(
        'EmailListVerify returned an invalid bulk progress response.'
      );
    }
    return parsed.data;
  }

  async getCredits() {
    let result = await this.request('GET', '/credits');
    let parsed = creditSchema.safeParse(result);
    if (!parsed.success) {
      throw createApiServiceError(
        'EmailListVerify returned an invalid credit balance response.'
      );
    }
    return parsed.data;
  }

  async checkDisposable(domain: string) {
    let result = await this.request('POST', '/checkDisposable', undefined, { domain });
    let parsed = disposableSchema.safeParse(result);
    if (!parsed.success) {
      throw createApiServiceError(
        'EmailListVerify returned an invalid disposable-domain response.'
      );
    }
    return parsed.data;
  }
}
