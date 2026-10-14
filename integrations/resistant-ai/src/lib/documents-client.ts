import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  createAxios,
  isApiErrorRecord,
  normalizeOAuthTokenResponse,
  pickDefined,
  requestAxios
} from 'slates';

let environments = {
  'eu-1': {
    baseUrl: 'https://api.documents.resistant.ai',
    tokenUrl: 'https://eu.id.resistant.ai/oauth2/aus2un1hkrKhPjir4417/v1/token'
  },
  'us-1': {
    baseUrl: 'https://api.us-1.documents.resistant.ai',
    tokenUrl: 'https://eu.id.resistant.ai/oauth2/aus3tzuy12e5blAJi417/v1/token'
  },
  'ca-1': {
    baseUrl: 'https://api.ca-1.documents.resistant.ai',
    tokenUrl: 'https://eu.id.resistant.ai/oauth2/ausd6inbxjwgeJfq4417/v1/token'
  },
  'ap-2': {
    baseUrl: 'https://api.ap-2.documents.resistant.ai',
    tokenUrl: 'https://eu.id.resistant.ai/oauth2/aus827qzu1l953dI4417/v1/token'
  },
  'ap-3': {
    baseUrl: 'https://api.ap-3.documents.resistant.ai',
    tokenUrl: 'https://eu.id.resistant.ai/oauth2/ausp40dse1Q0rzDq6417/v1/token'
  },
  testing: {
    baseUrl: 'https://api.documents.testing.resistant.ai',
    tokenUrl: 'https://eu.id.resistant.ai/oauth2/aus17c52xbW6c0yA9417/v1/token'
  }
} as const;

export let getDocumentsCredentials = async (input: {
  clientId: string;
  clientSecret: string;
  environment: keyof typeof environments;
}) => {
  if (!input.clientId.trim() || !input.clientSecret.trim()) {
    throw createApiServiceError('Resistant Documents requires a client ID and client secret.');
  }
  let environment = environments[input.environment];
  if (!environment) {
    throw createApiServiceError('Choose a supported Resistant Documents deployment cell.');
  }
  let http = createAuthenticatedAxios({
    authHeader: {
      value: `Basic ${Buffer.from(`${input.clientId}:${input.clientSecret}`).toString('base64')}`
    },
    contentType: 'application/x-www-form-urlencoded',
    headers: { Accept: 'application/json' },
    timeout: 30_000,
    maxRedirects: 0,
    errorAdapter: error =>
      buildApiServiceError(error, {
        providerLabel: 'Resistant Documents',
        reason: 'resistant_documents_auth_error',
        operation: 'get access token'
      })
  });
  let response = await http.post(
    environment.tokenUrl,
    new URLSearchParams({
      grant_type: 'client_credentials',
      scope: 'submissions.read submissions.write'
    }).toString()
  );
  let token = normalizeOAuthTokenResponse(response.data, {
    providerLabel: 'Resistant Documents',
    operation: 'client credentials',
    required: true
  });
  if (new Date(token.expiresAt ?? '').getTime() <= Date.now()) {
    throw createApiServiceError('Resistant Documents returned an expired access token.');
  }
  return {
    token: token.token,
    expiresAt: token.expiresAt,
    providerKind: 'resistant_documents' as const,
    documentsBaseUrl: environment.baseUrl
  };
};

export class DocumentsClient {
  private http: ReturnType<typeof createAuthenticatedAxios>;

  constructor(auth: {
    token: string;
    providerKind?: string;
    documentsBaseUrl?: string;
  }) {
    if (
      auth.providerKind !== 'resistant_documents' ||
      !auth.documentsBaseUrl ||
      !Object.values(environments).some(env => env.baseUrl === auth.documentsBaseUrl)
    ) {
      throw createApiServiceError(
        'This tool requires a Resistant Documents Client Credentials connection. IdentityCheck API keys cannot access the Documents API.'
      );
    }
    if (!auth.token.trim()) {
      throw createApiServiceError(
        'Reconnect your Resistant Documents credentials to obtain an access token.'
      );
    }
    this.http = createAuthenticatedAxios({
      baseURL: auth.documentsBaseUrl,
      authHeader: { value: `Bearer ${auth.token}` },
      headers: { Accept: 'application/json' },
      timeout: 30_000,
      maxRedirects: 0,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Resistant Documents',
          reason: 'resistant_documents_api_error'
        })
    });
  }

  async submitDocument(fileBase64: string, queryId?: string) {
    let encoded = fileBase64.replace(/\s/g, '');
    if (!encoded || encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
      throw createApiServiceError(
        'fileBase64 must contain the original document bytes as valid base64, without a data URL prefix.'
      );
    }
    if (queryId !== undefined && queryId.length > 1024) {
      throw createApiServiceError(
        'queryId must be at most 1024 characters and must not contain personal information.'
      );
    }
    let content = Buffer.from(encoded, 'base64');
    if (content.toString('base64') !== encoded) {
      throw createApiServiceError(
        'fileBase64 must be a valid base64 encoding of the original document bytes.'
      );
    }
    let response = await this.http.post('/v2/submission', {
      ...pickDefined({ query_id: queryId }),
      pipeline_configuration: 'FRAUD_ONLY',
      enable_decision: false,
      enable_submission_characteristics: false
    });
    let result = response.data;
    if (
      !isApiErrorRecord(result) ||
      typeof result.submission_id !== 'string' ||
      !result.submission_id ||
      typeof result.upload_url !== 'string'
    ) {
      throw createApiServiceError(
        'Resistant Documents did not return a submission ID and upload URL.'
      );
    }
    let uploadUrl: URL;
    try {
      uploadUrl = new URL(result.upload_url);
    } catch {
      throw createApiServiceError(
        `Resistant Documents returned an invalid upload URL for submission ${result.submission_id}. Use delete_document_submission to remove it before submitting again.`
      );
    }
    if (uploadUrl.protocol !== 'https:' || uploadUrl.username || uploadUrl.password) {
      throw createApiServiceError(
        `Resistant Documents returned an unsupported upload URL for submission ${result.submission_id}. Use delete_document_submission to remove it before submitting again.`
      );
    }
    let uploadHttp = createAxios({
      headers: { 'Content-Type': 'application/octet-stream' },
      timeout: 60_000,
      maxRedirects: 0,
      maxBodyLength: Number.POSITIVE_INFINITY
    });
    await requestAxios(
      'upload document',
      () => uploadHttp.put(uploadUrl.toString(), content),
      error =>
        buildApiServiceError(error, {
          providerLabel: 'Resistant Documents',
          reason: 'resistant_documents_upload_error',
          operation: `upload document for submission ${result.submission_id}. Use delete_document_submission to remove it before submitting again`
        })
    );
    return { submissionId: result.submission_id, queryId, status: 'uploaded' };
  }

  async getFraudResult(submissionId: string, withMetadata?: boolean) {
    if (!submissionId.trim()) {
      throw createApiServiceError('Provide a submissionId returned by submit_document.');
    }
    let response = await this.http.get(
      `/v2/submission/${encodeURIComponent(submissionId)}/fraud`,
      {
        params: pickDefined({ with_metadata: withMetadata }),
        validateStatus: status => status === 200 || status === 404
      }
    );
    if (response.status === 404) {
      return { ready: false, result: undefined };
    }
    if (!isApiErrorRecord(response.data) || typeof response.data.status !== 'string') {
      throw createApiServiceError('Resistant Documents returned an invalid fraud result.');
    }
    return { ready: true, result: response.data };
  }

  async deleteSubmission(submissionId: string) {
    if (!submissionId.trim()) {
      throw createApiServiceError('Provide a submissionId returned by submit_document.');
    }
    let response = await this.http.delete(
      `/v2/submission/${encodeURIComponent(submissionId)}`
    );
    if (response.status !== 204) {
      throw createApiServiceError(
        'Resistant Documents did not confirm deletion with HTTP 204. Check the submission before retrying.'
      );
    }
  }
}
