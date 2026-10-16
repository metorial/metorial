import { createHash, createHmac, randomUUID } from 'node:crypto';
import { buildApiServiceError, createAuthenticatedAxios } from 'slates';

export interface UrlUploadStatus {
  status: string;
  uuid?: string;
  file_id?: string;
  filename?: string;
  size?: number;
  total?: number;
  done?: number;
  is_stored?: boolean;
  is_image?: boolean;
  is_ready?: boolean;
  mime_type?: string;
  error?: string;
  error_code?: string;
  original_filename?: string;
}

export type UrlUploadResult =
  | { type: 'token'; token: string }
  | {
      type: 'file';
      uuid: string;
      file_id?: string;
      original_filename?: string;
      size?: number;
      mime_type?: string;
    };

export class UploadClient {
  constructor(
    private publicKey: string,
    private secretKey: string
  ) {}

  private getAxios(scope?: '/from_url/' | '/group/') {
    let authorization: string | undefined;
    if (scope) {
      // Uploadcare signs HS256 tokens with the raw SHA-256 digest of the secret.
      // Restrict this per-request credential to its endpoint and one operation.
      let iat = Math.floor(Date.now() / 1000);
      let header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString(
        'base64url'
      );
      let payload = Buffer.from(
        JSON.stringify({
          iat,
          exp: iat + 300,
          jti: randomUUID(),
          uc: { restrictions: { scope: [scope], limits: { operations: 1 } } }
        })
      ).toString('base64url');
      let signingKey = createHash('sha256').update(this.secretKey, 'utf8').digest();
      let signature = createHmac('sha256', signingKey)
        .update(`${header}.${payload}`)
        .digest('base64url');
      authorization = `Bearer ${header}.${payload}.${signature}`;
    }
    return createAuthenticatedAxios({
      baseURL: 'https://upload.uploadcare.com/',
      contentType: false,
      authHeader: authorization ? { value: authorization } : undefined,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Uploadcare Upload',
          reason: 'uploadcare_upload_error',
          extractResponse: (error, helpers) => helpers.getResponseWithBody(error),
          detailKeys: ['message', 'detail', 'error', 'error_code', 'error_description'],
          extractUpstreamCode: (_error, response, helpers) =>
            helpers.isRecord(response?.data) && typeof response.data.error_code === 'string'
              ? response.data.error_code
              : undefined
        })
    });
  }

  async uploadFromUrl(params: {
    sourceUrl: string;
    store?: string;
    filename?: string;
    checkUrlDuplicates?: boolean;
    saveUrlDuplicates?: boolean;
    metadata?: Record<string, string>;
  }): Promise<UrlUploadResult> {
    let axios = this.getAxios('/from_url/');
    let body = new URLSearchParams({
      pub_key: this.publicKey,
      source_url: params.sourceUrl
    });
    if (params.store !== undefined) body.set('store', params.store);
    if (params.filename !== undefined) body.set('filename', params.filename);
    if (params.checkUrlDuplicates !== undefined)
      body.set('check_URL_duplicates', params.checkUrlDuplicates ? '1' : '0');
    if (params.saveUrlDuplicates !== undefined)
      body.set('save_URL_duplicates', params.saveUrlDuplicates ? '1' : '0');
    if (params.metadata) {
      for (let [key, value] of Object.entries(params.metadata)) {
        body.set(`metadata[${key}]`, value);
      }
    }

    let response = await axios.post('/from_url/', body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  }

  async getUrlUploadStatus(token: string): Promise<UrlUploadStatus> {
    let response = await this.getAxios().get('/from_url/status/', { params: { token } });
    return response.data;
  }

  async createGroup(fileIds: string[]): Promise<{
    id: string;
    datetime_created: string;
    files_count: number;
    cdn_url: string;
    url: string;
    files: unknown[];
  }> {
    let params = new URLSearchParams({ pub_key: this.publicKey });
    for (let fileId of fileIds) params.append('files[]', fileId);
    let response = await this.getAxios('/group/').post('/group/', params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  }
}
