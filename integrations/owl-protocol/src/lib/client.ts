import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

export type OwlRecord = Record<string, unknown>;
export type ListOptions = {
  limit?: number;
  skip?: number;
  orderBy?: string;
  order?: 'asc' | 'desc';
};

let defaultRequestTimeoutMs = 120_000;
// @owlprotocol/core-trpc 3.1.0 exports a 300,000 ms receipt wait; allow 30 seconds for HTTP overhead.
let mintReceiptRequestTimeoutMs = 300_000 + 30_000;

export let mintTimeoutGuidance =
  'A timed-out mint may continue executing. Check Owl Protocol and the recipient token records, using any available userOpHash, before retrying. Do not blindly retry: another mint can create duplicate tokens.';

let owlApiError = (error: unknown, operation: string) =>
  buildApiServiceError(error, {
    providerLabel: 'Owl Protocol',
    reason: 'owl_protocol_api_error',
    operation,
    extractResponse: (error, helpers) => helpers.getResponseWithBody(error),
    detailKeys: ['message', 'detail', 'error_description'],
    nestedKeys: ['error', 'errors', 'json', 'data'],
    formatMessage: ({ providerLabel, operation, statusLabel, message, status }) => {
      let formatted = `${providerLabel} API ${operation} failed: ${statusLabel}${message}`;
      let record = isApiErrorRecord(error) ? error : undefined;
      let data = isApiErrorRecord(record?.data) ? record.data : undefined;
      let baggage = isApiErrorRecord(data?.baggage) ? data.baggage : undefined;
      let codes = [record?.code, data?.code, baggage?.axiosCode];
      let timeout =
        status === 408 ||
        status === 504 ||
        codes.some(code =>
          ['ECONNABORTED', 'ETIMEDOUT', 'upstream.timeout', 'TIMEOUT'].includes(String(code))
        );
      return operation === 'collection.erc721AutoId.mintBatch' && timeout
        ? `${formatted} ${mintTimeoutGuidance}`
        : formatted;
    },
    extractStatus: (_error, response) => {
      let body = response?.data;
      if (!isApiErrorRecord(body)) return response?.status;
      let error = isApiErrorRecord(body.error) ? body.error : body;
      let detail = isApiErrorRecord(error.json) ? error.json : error;
      let data = isApiErrorRecord(detail.data) ? detail.data : undefined;
      let status = data?.httpStatus;
      return typeof status === 'number' && status >= 400 && status <= 599
        ? status
        : response?.status;
    },
    extractUpstreamCode: (_error, response) => {
      let body = response?.data;
      if (!isApiErrorRecord(body)) return undefined;
      let error = isApiErrorRecord(body.error) ? body.error : body;
      let detail = isApiErrorRecord(error.json) ? error.json : error;
      let data = isApiErrorRecord(detail.data) ? detail.data : undefined;
      let code = data?.code ?? detail.code;
      return typeof code === 'string' || typeof code === 'number' ? String(code) : undefined;
    }
  });

export let owlRecord = (value: unknown, label = 'response'): OwlRecord => {
  if (!isApiErrorRecord(value)) {
    throw createApiServiceError(
      `Owl Protocol returned an invalid ${label}; expected an object.`,
      {
        reason: 'owl_protocol_invalid_response'
      }
    );
  }
  return value;
};

export let owlRecords = (value: unknown, label: string): OwlRecord[] => {
  if (!Array.isArray(value)) {
    throw createApiServiceError(
      `Owl Protocol returned an invalid ${label}; expected an array.`,
      {
        reason: 'owl_protocol_invalid_response'
      }
    );
  }
  return value.map(item => owlRecord(item, `${label} item`));
};

export let owlString = (value: unknown) => (typeof value === 'string' ? value : undefined);
export let owlNumber = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;
export let owlObject = (value: unknown) => (isApiErrorRecord(value) ? value : undefined);

export let requireOwlString = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || !value.trim()) {
    throw createApiServiceError(`Owl Protocol did not return a valid ${label}.`, {
      reason: 'owl_protocol_invalid_response'
    });
  }
  return value;
};

export let requireOwlNumber = (value: unknown, label: string): number => {
  let number = owlNumber(value);
  if (number === undefined) {
    throw createApiServiceError(`Owl Protocol did not return a valid ${label}.`, {
      reason: 'owl_protocol_invalid_response'
    });
  }
  return number;
};

export let requireChainId = (value: number | undefined): number => {
  if (value === undefined || !Number.isSafeInteger(value) || value <= 0) {
    throw createApiServiceError(
      'Provide a positive whole-number chainId for the blockchain network.',
      {
        reason: 'owl_protocol_invalid_chain_id'
      }
    );
  }
  return value;
};

export let requireInput = (value: string, label: string) => {
  if (!value.trim()) {
    throw createApiServiceError(`${label} must not be empty.`, {
      reason: 'owl_protocol_invalid_input'
    });
  }
  return value;
};

export let requireMetadata = (metadata: OwlRecord) => {
  if (!Object.keys(metadata).length) {
    throw createApiServiceError('Provide at least one metadata field.', {
      reason: 'owl_protocol_invalid_input'
    });
  }
};

export let userLookup = (input: { email?: string; externalId?: string; userId?: string }) => {
  // Keep the existing tool's documented lookup precedence when several selectors are supplied.
  if (input.email !== undefined) return { email: requireInput(input.email, 'email') };
  if (input.externalId !== undefined) {
    return { externalId: requireInput(input.externalId, 'externalId') };
  }
  if (input.userId !== undefined) return { userId: requireInput(input.userId, 'userId') };
  throw createApiServiceError(
    'Provide email, externalId, or userId to identify the project user.',
    {
      reason: 'owl_protocol_invalid_input'
    }
  );
};

export class OwlClient {
  private api;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('An Owl Protocol project API key is required.', {
        reason: 'owl_protocol_missing_api_key'
      });
    }
    this.api = createAuthenticatedAxios({
      baseURL: 'https://api.owl.build/api/trpc/',
      authHeader: { name: 'x-api-key', value: config.token },
      headers: { accept: 'application/json' },
      timeout: defaultRequestTimeoutMs
    });
  }

  private async request(
    procedure: string,
    method: 'GET' | 'POST',
    input: OwlRecord = {},
    timeout?: number
  ) {
    try {
      let response = await this.api.request<unknown>({
        url: procedure,
        method,
        ...(timeout === undefined ? {} : { timeout }),
        ...(method === 'GET' ? { params: { input: JSON.stringify(input) } } : { data: input })
      });
      let envelope = owlRecord(response.data, 'API envelope');
      if (envelope.error !== undefined) {
        throw owlApiError(
          { response: { status: response.status, data: envelope } },
          procedure
        );
      }
      let result = owlRecord(envelope.result, 'API result');
      if (!('data' in result)) {
        throw createApiServiceError('Owl Protocol returned an API result without data.', {
          reason: 'owl_protocol_invalid_response'
        });
      }
      return result.data;
    } catch (error) {
      throw owlApiError(error, procedure);
    }
  }

  async deployCollection(params: {
    chainId: number;
    name: string;
    symbol: string;
    baseUri?: string;
    royaltyReceiver?: string;
    feeNumerator?: string;
    contractImage?: string;
    contractImageSuffix?: string;
    description?: string;
    contractUri?: string;
  }) {
    return owlRecord(await this.request('collection.deploy', 'POST', params));
  }

  async mintBatchERC721(params: {
    chainId: number;
    contractAddress: string;
    to: string[];
    metadata?: OwlRecord;
    projectTokenTemplateId?: string;
    wait?: boolean;
  }) {
    let { contractAddress, ...body } = params;
    return owlRecord(
      await this.request(
        'collection.erc721AutoId.mintBatch',
        'POST',
        {
          ...body,
          address: contractAddress
        },
        // An omitted wait retains the provider default; allow for receipt waiting without changing it.
        params.wait === false ? undefined : mintReceiptRequestTimeoutMs
      )
    );
  }

  async getProjectToken(params: {
    chainId: number;
    contractAddress: string;
    tokenId: string;
  }) {
    let { contractAddress, ...input } = params;
    return owlRecord(
      await this.request('projectToken.get', 'GET', { ...input, address: contractAddress })
    );
  }

  async patchProjectToken(params: {
    chainId: number;
    contractAddress: string;
    tokenId: string;
    metadata: OwlRecord;
  }) {
    let { contractAddress, ...input } = params;
    return owlRecord(
      await this.request('projectToken.patch', 'POST', { ...input, address: contractAddress })
    );
  }

  async createTokenTemplate(params: {
    contractAddress?: string;
    metadata: OwlRecord;
    chainId?: number;
    externalId?: string;
  }) {
    let { contractAddress, ...input } = params;
    return owlRecord(
      await this.request('projectTokenTemplate.createOrSet', 'POST', {
        ...input,
        address: contractAddress
      })
    );
  }

  async getTokenTemplate(params: { templateId: string }) {
    return owlRecord(
      await this.request('projectTokenTemplate.get', 'GET', { id: params.templateId })
    );
  }

  async listTokenTemplates(params: ListOptions) {
    return owlRecords(
      await this.request('projectTokenTemplate.list', 'GET', params),
      'templates'
    );
  }

  async patchTokenTemplate(params: { templateId: string; metadata: OwlRecord }) {
    return owlRecord(
      await this.request('projectTokenTemplate.patch', 'POST', {
        id: params.templateId,
        metadata: params.metadata
      })
    );
  }

  async createUser(params: { email: string; fullName?: string; externalId?: string }) {
    return owlRecord(await this.request('projectUser.createOrSet', 'POST', params));
  }

  async getUser(params: {
    email?: string;
    externalId?: string;
    userId?: string;
    chainId: number;
  }) {
    return owlRecord(await this.request('projectUser.get', 'GET', params));
  }

  async listUsers(params: ListOptions) {
    return owlRecords(await this.request('projectUser.list', 'GET', params), 'users');
  }

  async getContractMetadata(params: { chainId: number; contractAddress: string }) {
    return owlRecord(
      await this.request('projectContractMetadata.get', 'GET', {
        chainId: params.chainId,
        address: params.contractAddress
      })
    );
  }

  async patchContractMetadata(params: {
    chainId: number;
    contractAddress: string;
    metadata: OwlRecord;
  }) {
    return owlRecord(
      await this.request('projectContractMetadata.patch', 'POST', {
        chainId: params.chainId,
        address: params.contractAddress,
        metadata: params.metadata
      })
    );
  }

  async listContractsMetadata(params: ListOptions) {
    return owlRecords(
      await this.request('projectContractMetadata.list', 'GET', params),
      'contract metadata'
    );
  }

  async getProject() {
    return owlRecord(await this.request('project.get', 'GET'));
  }

  async listProjectContracts(params: ListOptions) {
    return owlRecords(await this.request('projectContract.list', 'GET', params), 'contracts');
  }

  async getContract(params: { chainId: number; contractAddress: string }) {
    return owlRecord(
      await this.request('projectContract.get', 'GET', {
        chainId: params.chainId,
        address: params.contractAddress
      })
    );
  }

  async listUserTokens(params: { email?: string; externalId?: string; userId?: string }) {
    return owlRecords(
      await this.request('projectUser.listTokens', 'GET', params),
      'user tokens'
    );
  }
}
