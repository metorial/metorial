import { createAxios } from 'slates';

export class AlchemyClient {
  private api: ReturnType<typeof createAxios>;
  private notifyApi: ReturnType<typeof createAxios>;
  private network: string;
  private token: string;

  constructor(config: { token: string; network: string }) {
    this.token = config.token;
    this.network = config.network;

    this.api = createAxios({
      baseURL: `https://${config.network}.g.alchemy.com/v2/${config.token}`,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });

    this.notifyApi = createAxios({
      baseURL: 'https://dashboard.alchemy.com/api',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Alchemy-Token': config.token
      }
    });
  }

  // -- JSON-RPC Helper --

  private async jsonRpc<T>(method: string, params: any[] = []): Promise<T> {
    let response = await this.api.post('', {
      jsonrpc: '2.0',
      id: 1,
      method,
      params
    });
    if (response.data.error) {
      throw new Error(
        `JSON-RPC error: ${response.data.error.message || JSON.stringify(response.data.error)}`
      );
    }
    return response.data.result as T;
  }

  // -- Node API (JSON-RPC) --

  async getBalance(address: string, blockTag: string = 'latest'): Promise<string> {
    return this.jsonRpc<string>('eth_getBalance', [address, blockTag]);
  }

  async getBlockNumber(): Promise<string> {
    return this.jsonRpc<string>('eth_blockNumber');
  }

  async getBlockByNumber(
    blockNumber: string,
    fullTransactions: boolean = false
  ): Promise<any> {
    return this.jsonRpc<any>('eth_getBlockByNumber', [blockNumber, fullTransactions]);
  }

  async getBlockByHash(blockHash: string, fullTransactions: boolean = false): Promise<any> {
    return this.jsonRpc<any>('eth_getBlockByHash', [blockHash, fullTransactions]);
  }

  async getTransactionByHash(txHash: string): Promise<any> {
    return this.jsonRpc<any>('eth_getTransactionByHash', [txHash]);
  }

  async getTransactionReceipt(txHash: string): Promise<any> {
    return this.jsonRpc<any>('eth_getTransactionReceipt', [txHash]);
  }

  async call(
    transaction: { to: string; data?: string; from?: string; value?: string; gas?: string },
    blockTag: string = 'latest'
  ): Promise<string> {
    return this.jsonRpc<string>('eth_call', [transaction, blockTag]);
  }

  async estimateGas(transaction: {
    to?: string;
    from?: string;
    data?: string;
    value?: string;
  }): Promise<string> {
    return this.jsonRpc<string>('eth_estimateGas', [transaction]);
  }

  async sendRawTransaction(signedTx: string): Promise<string> {
    return this.jsonRpc<string>('eth_sendRawTransaction', [signedTx]);
  }

  async getTransactionCount(address: string, blockTag: string = 'latest'): Promise<string> {
    return this.jsonRpc<string>('eth_getTransactionCount', [address, blockTag]);
  }

  async getGasPrice(): Promise<string> {
    return this.jsonRpc<string>('eth_gasPrice');
  }

  async getLogs(filter: {
    fromBlock?: string;
    toBlock?: string;
    address?: string | string[];
    topics?: (string | string[] | null)[];
  }): Promise<any[]> {
    return this.jsonRpc<any[]>('eth_getLogs', [filter]);
  }

  // -- Token API (Alchemy enhanced JSON-RPC) --

  async getTokenBalances(
    address: string,
    tokenAddresses?: string[],
    pageKey?: string
  ): Promise<any> {
    let params: any[] = [address];
    if (tokenAddresses && tokenAddresses.length > 0) {
      params.push(tokenAddresses);
    } else {
      params.push('erc20');
    }
    if (pageKey) {
      params.push({ pageKey });
    }
    return this.jsonRpc<any>('alchemy_getTokenBalances', params);
  }

  async getTokenMetadata(contractAddress: string): Promise<any> {
    return this.jsonRpc<any>('alchemy_getTokenMetadata', [contractAddress]);
  }

  async getTokenAllowance(
    contractAddress: string,
    owner: string,
    spender: string
  ): Promise<string> {
    return this.jsonRpc<string>('alchemy_getTokenAllowance', [
      { contract: contractAddress, owner, spender }
    ]);
  }

  // -- Transfers API --

  async getAssetTransfers(params: {
    fromBlock?: string;
    toBlock?: string;
    fromAddress?: string;
    toAddress?: string;
    contractAddresses?: string[];
    category: string[];
    order?: string;
    maxCount?: string;
    pageKey?: string;
    withMetadata?: boolean;
    excludeZeroValue?: boolean;
  }): Promise<any> {
    return this.jsonRpc<any>('alchemy_getAssetTransfers', [params]);
  }

  // -- NFT API v3 (REST) --

  private getNftApiBaseUrl(): string {
    return `https://${this.network}.g.alchemy.com/nft/v3/${this.token}`;
  }

  async getNFTsForOwner(params: {
    owner: string;
    contractAddresses?: string[];
    pageKey?: string;
    pageSize?: number;
    withMetadata?: boolean;
    excludeFilters?: string[];
    includeFilters?: string[];
    orderBy?: string;
  }): Promise<any> {
    let nftApi = createAxios({ baseURL: this.getNftApiBaseUrl() });
    let queryParams: any = { owner: params.owner, withMetadata: params.withMetadata ?? true };
    if (params.contractAddresses)
      queryParams['contractAddresses[]'] = params.contractAddresses;
    if (params.pageKey) queryParams.pageKey = params.pageKey;
    if (params.pageSize) queryParams.pageSize = params.pageSize;
    if (params.excludeFilters) queryParams['excludeFilters[]'] = params.excludeFilters;
    if (params.includeFilters) queryParams['includeFilters[]'] = params.includeFilters;
    if (params.orderBy) queryParams.orderBy = params.orderBy;
    let response = await nftApi.get('/getNFTsForOwner', { params: queryParams });
    return response.data;
  }

  async getNFTMetadata(
    contractAddress: string,
    tokenId: string,
    tokenType?: string
  ): Promise<any> {
    let nftApi = createAxios({ baseURL: this.getNftApiBaseUrl() });
    let queryParams: any = { contractAddress, tokenId };
    if (tokenType) queryParams.tokenType = tokenType;
    let response = await nftApi.get('/getNFTMetadata', { params: queryParams });
    return response.data;
  }

  async getOwnersForNFT(
    contractAddress: string,
    tokenId: string,
    pageKey?: string
  ): Promise<any> {
    let nftApi = createAxios({ baseURL: this.getNftApiBaseUrl() });
    let queryParams: any = { contractAddress, tokenId };
    if (pageKey) queryParams.pageKey = pageKey;
    let response = await nftApi.get('/getOwnersForNFT', { params: queryParams });
    return response.data;
  }

  async getOwnersForContract(
    contractAddress: string,
    withTokenBalances?: boolean,
    pageKey?: string
  ): Promise<any> {
    let nftApi = createAxios({ baseURL: this.getNftApiBaseUrl() });
    let queryParams: any = { contractAddress };
    if (withTokenBalances !== undefined) queryParams.withTokenBalances = withTokenBalances;
    if (pageKey) queryParams.pageKey = pageKey;
    let response = await nftApi.get('/getOwnersForContract', { params: queryParams });
    return response.data;
  }

  async getContractMetadata(contractAddress: string): Promise<any> {
    let nftApi = createAxios({ baseURL: this.getNftApiBaseUrl() });
    let response = await nftApi.get('/getContractMetadata', { params: { contractAddress } });
    return response.data;
  }

  async getNFTSales(params: {
    contractAddress?: string;
    tokenId?: string;
    fromBlock?: number;
    toBlock?: number | string;
    order?: string;
    marketplace?: string;
    buyerAddress?: string;
    sellerAddress?: string;
    pageKey?: string;
    limit?: number;
  }): Promise<any> {
    let nftApi = createAxios({ baseURL: this.getNftApiBaseUrl() });
    let response = await nftApi.get('/getNFTSales', { params });
    return response.data;
  }

  async isSpamContract(contractAddress: string): Promise<any> {
    let nftApi = createAxios({ baseURL: this.getNftApiBaseUrl() });
    let response = await nftApi.get('/isSpamContract', { params: { contractAddress } });
    return response.data;
  }

  async getNFTsForContract(
    contractAddress: string,
    params?: {
      startToken?: string;
      limit?: number;
      withMetadata?: boolean;
    }
  ): Promise<any> {
    let nftApi = createAxios({ baseURL: this.getNftApiBaseUrl() });
    let queryParams: any = { contractAddress, ...params };
    let response = await nftApi.get('/getNFTsForContract', { params: queryParams });
    return response.data;
  }

  // -- Prices API --

  async getTokenPrices(params: {
    addresses: { network: string; address: string }[];
  }): Promise<any> {
    let pricesApi = createAxios({
      baseURL: 'https://api.g.alchemy.com/prices/v1',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`
      }
    });
    let response = await pricesApi.post('/tokens/by-address', {
      addresses: params.addresses
    });
    return response.data;
  }

  // -- Transaction Simulation --

  async simulateExecution(params: {
    from: string;
    to: string;
    value?: string;
    data?: string;
  }): Promise<any> {
    return this.jsonRpc<any>('alchemy_simulateExecution', [params]);
  }

  async simulateAssetChanges(params: {
    from: string;
    to: string;
    value?: string;
    data?: string;
  }): Promise<any> {
    return this.jsonRpc<any>('alchemy_simulateAssetChanges', [params]);
  }

  // -- Notify API (Webhooks) --

  async createWebhook(params: {
    webhookType: string;
    webhookUrl: string;
    network?: string;
    addresses?: string[];
    nftFilters?: { contractAddress: string; tokenId?: string }[];
    graphqlQuery?: string;
  }): Promise<any> {
    let body: any = {
      webhook_type: params.webhookType,
      webhook_url: params.webhookUrl
    };
    if (params.network) body.network = params.network;
    if (params.addresses) body.addresses = params.addresses;
    if (params.nftFilters)
      body.nft_filters = params.nftFilters.map(f => ({
        contract_address: f.contractAddress,
        token_id: f.tokenId
      }));
    if (params.graphqlQuery) body.graphql_query = params.graphqlQuery;

    let response = await this.notifyApi.post('/create-webhook', body);
    return response.data;
  }

  async deleteWebhook(webhookId: string): Promise<any> {
    let response = await this.notifyApi.delete('/delete-webhook', {
      data: { webhook_id: webhookId }
    });
    return response.data;
  }

  async updateWebhookAddresses(params: {
    webhookId: string;
    addressesToAdd?: string[];
    addressesToRemove?: string[];
  }): Promise<any> {
    let response = await this.notifyApi.patch('/update-webhook-addresses', {
      webhook_id: params.webhookId,
      addresses_to_add: params.addressesToAdd || [],
      addresses_to_remove: params.addressesToRemove || []
    });
    return response.data;
  }

  async getWebhooks(): Promise<any> {
    let response = await this.notifyApi.get('/team-webhooks');
    return response.data;
  }
}
