import { createAxios } from 'slates';

let api = createAxios({
  baseURL: 'https://contracts-api.owlprotocol.xyz/api'
});

export class OwlClient {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private get headers() {
    return {
      'x-api-key': this.token,
      accept: 'application/json',
      'content-type': 'application/json'
    };
  }

  // ─── Collection Endpoints ───────────────────────────────────────

  async deployCollection(params: {
    chainId: number;
    name: string;
    symbol: string;
    baseUri?: string;
    royaltyReceiver?: string;
    feeNumerator?: string;
    contractImage?: string;
    contractImageSuffix?: string;
  }) {
    let response = await api.post('/project/collection/deploy', params, {
      headers: this.headers
    });
    return response.data;
  }

  // ─── Mint Endpoints ─────────────────────────────────────────────

  async mintBatchERC721(params: {
    chainId: number;
    contractAddress: string;
    to: string[];
    metadata?: {
      name?: string;
      description?: string;
      image?: string;
      attributes?: Array<{ trait_type: string; value: string }>;
    };
    projectTokenTemplateId?: string;
  }) {
    let { chainId, contractAddress, to, metadata, projectTokenTemplateId } = params;
    let body: Record<string, unknown> = { to };
    if (metadata) body.metadata = metadata;
    if (projectTokenTemplateId) body.projectTokenTemplateId = projectTokenTemplateId;

    let response = await api.post(
      `/project/collection/${chainId}/${contractAddress}/mint-batch/erc721AutoId`,
      body,
      { headers: this.headers }
    );
    return response.data;
  }

  // ─── Project Token Endpoints ────────────────────────────────────

  async getProjectToken(params: {
    chainId: number;
    contractAddress: string;
    tokenId: string;
  }) {
    let response = await api.get('/project/token', {
      headers: this.headers,
      params: {
        chainId: params.chainId,
        address: params.contractAddress,
        tokenId: params.tokenId
      }
    });
    return response.data;
  }

  async patchProjectToken(params: {
    chainId: number;
    contractAddress: string;
    tokenId: string;
    metadata: Record<string, unknown>;
  }) {
    let response = await api.patch(
      '/project/token',
      {
        chainId: params.chainId,
        address: params.contractAddress,
        tokenId: params.tokenId,
        metadata: params.metadata
      },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  // ─── Project Token Template Endpoints ───────────────────────────

  async createTokenTemplate(params: {
    contractAddress?: string;
    metadata: {
      name?: string;
      description?: string;
      image?: string;
      attributes?: Array<{ trait_type: string; value: string }>;
    };
  }) {
    let body: Record<string, unknown> = { metadata: params.metadata };
    if (params.contractAddress) body.address = params.contractAddress;

    let response = await api.post('/project/tokenTemplate', body, {
      headers: this.headers
    });
    return response.data;
  }

  async getTokenTemplate(params: { templateId: string }) {
    let response = await api.get('/project/tokenTemplate', {
      headers: this.headers,
      params: { id: params.templateId }
    });
    return response.data;
  }

  async listTokenTemplates() {
    let response = await api.get('/project/tokenTemplate', {
      headers: this.headers
    });
    return response.data;
  }

  async patchTokenTemplate(params: { templateId: string; metadata: Record<string, unknown> }) {
    let response = await api.patch(
      '/project/tokenTemplate',
      {
        id: params.templateId,
        metadata: params.metadata
      },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  // ─── Project User Endpoints ─────────────────────────────────────

  async createUser(params: { email: string; fullName?: string; externalId?: string }) {
    let response = await api.post('/project/projectUser', params, {
      headers: this.headers
    });
    return response.data;
  }

  async getUser(params: {
    email?: string;
    externalId?: string;
    userId?: string;
    chainId?: number;
  }) {
    let response = await api.get('/project/projectUser', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async listUsers() {
    let response = await api.get('/project/projectUser', {
      headers: this.headers,
      params: { list: true }
    });
    return response.data;
  }

  // ─── Contract Metadata Endpoints ────────────────────────────────

  async getContractMetadata(params: { chainId: number; contractAddress: string }) {
    let response = await api.get('/project/contractMetadata', {
      headers: this.headers,
      params: {
        chainId: params.chainId,
        address: params.contractAddress
      }
    });
    return response.data;
  }

  async patchContractMetadata(params: {
    chainId: number;
    contractAddress: string;
    metadata: Record<string, unknown>;
  }) {
    let response = await api.patch(
      '/project/contractMetadata',
      {
        chainId: params.chainId,
        address: params.contractAddress,
        ...params.metadata
      },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async listContractsMetadata() {
    let response = await api.get('/project/contractMetadata', {
      headers: this.headers,
      params: { list: true }
    });
    return response.data;
  }

  // ─── Auth Check ─────────────────────────────────────────────────

  async checkAuth() {
    let response = await api.post(
      '/auth',
      {},
      {
        headers: this.headers
      }
    );
    return response.data;
  }
}
