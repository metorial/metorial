import { buildApiServiceError, createApiServiceError, createAxios } from 'slates';
import { z } from 'zod';
import {
  blockSchema,
  hexData,
  logsSchema,
  nftSchema,
  ownedNftsSchema,
  ownersSchema,
  parseResponse,
  pricesSchema,
  quantity,
  receiptSchema,
  tokenBalancesSchema,
  tokenMetadataSchema,
  transactionSchema,
  transfersSchema
} from './responses';

export class AlchemyClient {
  private api: ReturnType<typeof createAxios>;
  private nftApi: ReturnType<typeof createAxios>;
  private pricesApi: ReturnType<typeof createAxios>;
  private token: string;

  constructor(config: { token: string; network: string }) {
    if (!config.token.trim()) throw createApiServiceError('An Alchemy API key is required.');
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(config.network)) {
      throw createApiServiceError('Use an Alchemy network identifier such as eth-mainnet.');
    }
    this.token = config.token;
    let host = `https://${config.network}.g.alchemy.com`;
    let headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
    this.api = createAxios({
      baseURL: `${host}/v2/${encodeURIComponent(config.token)}`,
      headers
    });
    this.nftApi = createAxios({
      baseURL: `${host}/nft/v3/${encodeURIComponent(config.token)}`,
      headers,
      paramsSerializer: { indexes: null }
    });
    this.pricesApi = createAxios({
      baseURL: 'https://api.g.alchemy.com/prices/v1',
      headers: { ...headers, Authorization: `Bearer ${config.token}` }
    });
  }

  private redact(value: unknown): unknown {
    if (typeof value === 'string') {
      return value
        .replaceAll(this.token, '[redacted]')
        .replaceAll(encodeURIComponent(this.token), '[redacted]')
        .replace(
          /([?&](?:api[-_]?key|access[-_]?token|token|secret|authorization)=)[^&#\s]*/gi,
          '$1[redacted]'
        )
        .replace(/\bBearer\s+[^\s"'<>]+/gi, 'Bearer [redacted]');
    }
    if (Array.isArray(value)) return value.map(item => this.redact(item));
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
          key,
          /^(?:api[-_]?key|access[-_]?token|authorization|secret|password)$/i.test(key)
            ? '[redacted]'
            : this.redact(item)
        ])
      );
    }
    return value;
  }

  private async request<T>(
    operation: string,
    schema: z.ZodType<T>,
    run: () => Promise<{ data: unknown }>
  ): Promise<T> {
    try {
      let response = await run();
      return parseResponse(schema, this.redact(response.data), operation);
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Alchemy',
        reason: 'alchemy_request_failed',
        operation,
        extractResponse: (input, helpers) => {
          let response = helpers.getResponseWithBody(input);
          return response ? { ...response, data: this.redact(response.data) } : undefined;
        },
        extractMessage: (input, helpers) => {
          let response = helpers.getResponseWithBody(input);
          return String(
            this.redact(
              helpers.extractMessage(
                response
                  ? { response: { ...response, data: this.redact(response.data) } }
                  : input
              )
            )
          );
        },
        parent: {}
      });
    }
  }

  private async jsonRpc<T>(
    method: string,
    params: unknown[],
    schema: z.ZodType<T>
  ): Promise<T> {
    let envelope = await this.request(
      method,
      z
        .object({ result: z.unknown().optional(), error: z.unknown().optional() })
        .passthrough(),
      () => this.api.post('', { jsonrpc: '2.0', id: 1, method, params })
    );
    if (envelope.error !== undefined && envelope.error !== null) {
      throw buildApiServiceError(
        { response: { data: envelope.error } },
        {
          providerLabel: 'Alchemy',
          reason: 'alchemy_rpc_failed',
          operation: method,
          parent: {}
        }
      );
    }
    return parseResponse(schema, envelope.result, method);
  }

  getBalance(address: string, blockTag = 'latest') {
    return this.jsonRpc('eth_getBalance', [address, blockTag], quantity);
  }
  getBlockNumber() {
    return this.jsonRpc('eth_blockNumber', [], quantity);
  }
  getChainId() {
    return this.jsonRpc('eth_chainId', [], quantity);
  }
  getClientVersion() {
    return this.jsonRpc('web3_clientVersion', [], z.string());
  }
  getBlockByNumber(blockNumber: string, fullTransactions = false) {
    return this.jsonRpc('eth_getBlockByNumber', [blockNumber, fullTransactions], blockSchema);
  }
  getBlockByHash(blockHash: string, fullTransactions = false) {
    return this.jsonRpc('eth_getBlockByHash', [blockHash, fullTransactions], blockSchema);
  }
  getTransactionByHash(hash: string) {
    return this.jsonRpc('eth_getTransactionByHash', [hash], transactionSchema);
  }
  getTransactionReceipt(hash: string) {
    return this.jsonRpc('eth_getTransactionReceipt', [hash], receiptSchema);
  }
  call(
    transaction: { to: string; data?: string; from?: string; value?: string; gas?: string },
    blockTag = 'latest'
  ) {
    return this.jsonRpc('eth_call', [transaction, blockTag], hexData);
  }
  estimateGas(transaction: {
    to?: string;
    from?: string;
    data?: string;
    value?: string;
    gas?: string;
  }) {
    return this.jsonRpc('eth_estimateGas', [transaction], quantity);
  }
  sendRawTransaction(signedTx: string) {
    return this.jsonRpc(
      'eth_sendRawTransaction',
      [signedTx],
      z.string().regex(/^0x[0-9a-f]{64}$/i)
    );
  }
  getTransactionCount(address: string, blockTag = 'latest') {
    return this.jsonRpc('eth_getTransactionCount', [address, blockTag], quantity);
  }
  getGasPrice() {
    return this.jsonRpc('eth_gasPrice', [], quantity);
  }
  getLogs(filter: {
    fromBlock?: string;
    toBlock?: string;
    address?: string | string[];
    topics?: (string | string[] | null)[];
  }) {
    return this.jsonRpc('eth_getLogs', [filter], logsSchema);
  }
  getTokenBalances(address: string, tokenAddresses?: string[], pageKey?: string) {
    return this.jsonRpc(
      'alchemy_getTokenBalances',
      [
        address,
        tokenAddresses?.length ? tokenAddresses : 'erc20',
        ...(pageKey ? [{ pageKey }] : [])
      ],
      tokenBalancesSchema
    );
  }
  getTokenMetadata(contractAddress: string) {
    return this.jsonRpc('alchemy_getTokenMetadata', [contractAddress], tokenMetadataSchema);
  }
  getTokenAllowance(contract: string, owner: string, spender: string) {
    return this.jsonRpc(
      'alchemy_getTokenAllowance',
      [{ contract, owner, spender }],
      z.string().regex(/^\d+$/)
    );
  }
  getAssetTransfers(params: {
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
  }) {
    return this.jsonRpc('alchemy_getAssetTransfers', [params], transfersSchema);
  }
  getNFTsForOwner(params: {
    owner: string;
    contractAddresses?: string[];
    pageKey?: string;
    pageSize?: number;
    withMetadata?: boolean;
    excludeFilters?: string[];
    orderBy?: string;
  }) {
    let { contractAddresses, excludeFilters, ...rest } = params;
    return this.request('getNFTsForOwner', ownedNftsSchema, () =>
      this.nftApi.get('/getNFTsForOwner', {
        params: {
          ...rest,
          withMetadata: params.withMetadata ?? true,
          'contractAddresses[]': contractAddresses,
          'excludeFilters[]': excludeFilters
        }
      })
    );
  }
  getNFTMetadata(contractAddress: string, tokenId: string) {
    return this.request('getNFTMetadata', nftSchema, () =>
      this.nftApi.get('/getNFTMetadata', { params: { contractAddress, tokenId } })
    );
  }
  getOwnersForNFT(contractAddress: string, tokenId: string, pageKey?: string) {
    return this.request('getOwnersForNFT', ownersSchema, () =>
      this.nftApi.get('/getOwnersForNFT', { params: { contractAddress, tokenId, pageKey } })
    );
  }
  getOwnersForContract(
    contractAddress: string,
    withTokenBalances?: boolean,
    pageKey?: string
  ) {
    return this.request('getOwnersForContract', ownersSchema, () =>
      this.nftApi.get('/getOwnersForContract', {
        params: { contractAddress, withTokenBalances, pageKey }
      })
    );
  }
  async isSpamContract(contractAddress: string) {
    let result = await this.request(
      'isSpamContract',
      z.union([z.boolean(), z.object({ isSpamContract: z.boolean() }).passthrough()]),
      () => this.nftApi.get('/isSpamContract', { params: { contractAddress } })
    );
    return typeof result === 'boolean' ? result : result.isSpamContract;
  }

  getTokenPrices(params: { addresses: { network: string; address: string }[] }) {
    return this.request('token prices', pricesSchema, () =>
      this.pricesApi.post('/tokens/by-address', params)
    );
  }

  async simulateExecution(params: {
    from: string;
    to: string;
    value?: string;
    data?: string;
  }): Promise<any> {
    return this.jsonRpc(
      'alchemy_simulateExecution',
      [params],
      z.record(z.string(), z.unknown())
    );
  }
  async simulateAssetChanges(params: {
    from: string;
    to: string;
    value?: string;
    data?: string;
  }): Promise<any> {
    return this.jsonRpc(
      'alchemy_simulateAssetChanges',
      [params],
      z.record(z.string(), z.unknown())
    );
  }
}
