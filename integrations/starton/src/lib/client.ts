import { createAxios } from 'slates';

export class StartonClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.starton.com/v3',
      headers: {
        'x-api-key': config.token
      }
    });
  }

  // Smart Contract - Deploy from template
  async deployFromTemplate(params: {
    templateId: string;
    network: string;
    signerWallet: string;
    name: string;
    description?: string;
    params: any[];
    speed?: string;
  }) {
    let response = await this.axios.post('/smart-contract/from-template', {
      templateId: params.templateId,
      network: params.network,
      signerWallet: params.signerWallet,
      name: params.name,
      description: params.description,
      params: params.params,
      speed: params.speed || 'average'
    });
    return response.data;
  }

  // Smart Contract - Deploy from bytecode
  async deployFromBytecode(params: {
    abi: any[];
    bytecode: string;
    network: string;
    signerWallet: string;
    name: string;
    description?: string;
    params: any[];
    speed?: string;
  }) {
    let response = await this.axios.post('/smart-contract/from-bytecode', {
      abi: params.abi,
      bytecode: params.bytecode,
      network: params.network,
      signerWallet: params.signerWallet,
      name: params.name,
      description: params.description,
      params: params.params,
      speed: params.speed || 'average'
    });
    return response.data;
  }

  // Smart Contract - Import existing
  async importSmartContract(params: {
    abi: any[];
    network: string;
    address: string;
    name: string;
    description?: string;
  }) {
    let response = await this.axios.post('/smart-contract/import-existing', {
      abi: params.abi,
      network: params.network,
      address: params.address,
      name: params.name,
      description: params.description
    });
    return response.data;
  }

  // Smart Contract - List
  async listSmartContracts(params?: {
    limit?: number;
    page?: number;
    network?: string;
    includeAbi?: boolean;
    includeCompilationDetails?: boolean;
  }) {
    let response = await this.axios.get('/smart-contract', {
      params: {
        limit: params?.limit || 20,
        page: params?.page || 0,
        network: params?.network,
        includeAbi: params?.includeAbi,
        includeCompilationDetails: params?.includeCompilationDetails
      }
    });
    return response.data;
  }

  // Smart Contract - Get one
  async getSmartContract(network: string, address: string) {
    let response = await this.axios.get(`/smart-contract/${network}/${address}`);
    return response.data;
  }

  // Smart Contract - Delete
  async deleteSmartContract(network: string, address: string) {
    let response = await this.axios.delete(`/smart-contract/${network}/${address}`);
    return response.data;
  }

  // Smart Contract - Get available functions
  async getAvailableFunctions(network: string, address: string) {
    let response = await this.axios.get(
      `/smart-contract/${network}/${address}/available-functions`
    );
    return response.data;
  }

  // Smart Contract - Call (write)
  async callSmartContract(params: {
    network: string;
    address: string;
    functionName: string;
    params: any[];
    signerWallet: string;
    speed?: string;
    gasLimit?: string;
    value?: string;
  }) {
    let response = await this.axios.post(
      `/smart-contract/${params.network}/${params.address}/call`,
      {
        functionName: params.functionName,
        params: params.params,
        signerWallet: params.signerWallet,
        speed: params.speed || 'average',
        gasLimit: params.gasLimit,
        value: params.value
      }
    );
    return response.data;
  }

  // Smart Contract - Read
  async readSmartContract(params: {
    network: string;
    address: string;
    functionName: string;
    params: any[];
  }) {
    let response = await this.axios.post(
      `/smart-contract/${params.network}/${params.address}/read`,
      {
        functionName: params.functionName,
        params: params.params
      }
    );
    return response.data;
  }

  // IPFS - Upload file
  async uploadFileToIpfs(params: {
    file: string;
    fileName: string;
    metadata?: Record<string, string>;
  }) {
    let response = await this.axios.post('/ipfs/file', params);
    return response.data;
  }

  // IPFS - Upload JSON
  async uploadJsonToIpfs(params: {
    name: string;
    content: any;
    metadata?: Record<string, string>;
  }) {
    let response = await this.axios.post('/ipfs/json', {
      name: params.name,
      content: params.content,
      metadata: params.metadata
    });
    return response.data;
  }

  // IPFS - List pins
  async listIpfsPins(params?: { limit?: number; page?: number }) {
    let response = await this.axios.get('/ipfs/pin', {
      params: {
        limit: params?.limit || 20,
        page: params?.page || 0
      }
    });
    return response.data;
  }

  // IPFS - Delete pin
  async deleteIpfsPin(pinId: string) {
    let response = await this.axios.delete(`/ipfs/pin/${pinId}`);
    return response.data;
  }

  // Watcher - Create
  async createWatcher(params: {
    name: string;
    description?: string;
    address: string;
    network: string;
    type: string;
    webhookUrl: string;
    confirmationsBlocks: number;
    customEventAbi?: any;
  }) {
    let response = await this.axios.post('/watcher', {
      name: params.name,
      description: params.description,
      address: params.address,
      network: params.network,
      type: params.type,
      webhookUrl: params.webhookUrl,
      confirmationsBlocks: params.confirmationsBlocks,
      customEventAbi: params.customEventAbi
    });
    return response.data;
  }

  // Watcher - List
  async listWatchers(params?: {
    limit?: number;
    page?: number;
    network?: string;
    type?: string;
  }) {
    let response = await this.axios.get('/watcher', {
      params: {
        limit: params?.limit || 20,
        page: params?.page || 0,
        network: params?.network,
        type: params?.type
      }
    });
    return response.data;
  }

  // Watcher - Get one
  async getWatcher(watcherId: string) {
    let response = await this.axios.get(`/watcher/${watcherId}`);
    return response.data;
  }

  // Watcher - Update
  async updateWatcher(
    watcherId: string,
    params: {
      name?: string;
      description?: string;
      isPaused?: boolean;
    }
  ) {
    let response = await this.axios.patch(`/watcher/${watcherId}`, params);
    return response.data;
  }

  // Watcher - Delete
  async deleteWatcher(watcherId: string) {
    let response = await this.axios.delete(`/watcher/${watcherId}`);
    return response.data;
  }

  // Watcher - Get events
  async getWatcherEvents(watcherId: string) {
    let response = await this.axios.get(`/watcher/${watcherId}/event`);
    return response.data;
  }

  // Wallet - Create
  async createWallet(params: { description?: string; name?: string; kmsId?: string }) {
    let response = await this.axios.post('/kms/wallet', params);
    return response.data;
  }

  // Wallet - List
  async listWallets(params?: { limit?: number; page?: number }) {
    let response = await this.axios.get('/kms/wallet', {
      params: {
        limit: params?.limit || 20,
        page: params?.page || 0
      }
    });
    return response.data;
  }

  // Transaction - Get one
  async getTransaction(transactionId: string) {
    let response = await this.axios.get(`/transaction/${transactionId}`);
    return response.data;
  }

  // Transaction - List
  async listTransactions(params?: { limit?: number; page?: number; network?: string }) {
    let response = await this.axios.get('/transaction', {
      params: {
        limit: params?.limit || 20,
        page: params?.page || 0,
        network: params?.network
      }
    });
    return response.data;
  }

  // Smart Contract Templates - List
  async listTemplates(params?: { limit?: number; page?: number }) {
    let response = await this.axios.get('/smart-contract-template', {
      params: {
        limit: params?.limit || 20,
        page: params?.page || 0
      }
    });
    return response.data;
  }

  // Smart Contract Templates - Get one
  async getTemplate(templateId: string) {
    let response = await this.axios.get(`/smart-contract-template/${templateId}`);
    return response.data;
  }

  // Network - List supported
  async listNetworks() {
    let response = await this.axios.get('/network');
    return response.data;
  }

  // Project
  async getProject() {
    let response = await this.axios.get('/project');
    return response.data;
  }
}
