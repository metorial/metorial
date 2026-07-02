import { createAxios } from 'slates';

let gasApi = createAxios({
  baseURL: 'https://api.blocknative.com'
});

let ethernowApi = createAxios({
  baseURL: 'https://api.ethernow.xyz'
});

export interface GasPriceParams {
  chainId?: number;
  system?: string;
  network?: string;
  confidenceLevels?: number[];
}

export interface EstimatedPrice {
  confidence: number;
  price: number;
  maxPriorityFeePerGas: number;
  maxFeePerGas: number;
}

export interface BlockPrice {
  blockNumber: number;
  estimatedTransactionCount: number;
  baseFeePerGas: number;
  blobBaseFeePerGas: number;
  estimatedPrices: EstimatedPrice[];
}

export interface GasPriceResponse {
  system: string;
  network: string;
  unit: string;
  maxPrice: number;
  currentBlockNumber: number;
  msSinceLastBlock: number;
  blockPrices: BlockPrice[];
}

export interface GasDistributionResponse {
  system: string;
  network: string;
  unit: string;
  maxPrice: number;
  currentBlockNumber: number;
  msSinceLastBlock: number;
  topNDistribution: {
    distribution: [number, number][];
    n: number;
  };
}

export interface BaseFeeEstimate {
  confidence: number;
  baseFee: number;
  blobBaseFee: number;
}

export interface BaseFeeEstimatesResponse {
  system: string;
  network: string;
  unit: string;
  currentBlockNumber: number;
  msSinceLastBlock: number;
  baseFeePerGas: number;
  blobBaseFeePerGas: number;
  estimatedBaseFees: Record<string, BaseFeeEstimate[]>[];
}

export interface ChainInfo {
  arch: string;
  chainId: number;
  label: string;
  features: string[];
  icon: string;
  system: string;
  network: string;
}

export interface OracleInfo {
  chainId: number;
  label: string;
  name: string;
  network: string;
  addressByVersion: Record<string, string>;
  rpcUrl: string;
  blockExplorerUrl: string;
  arch: string;
  icon: string;
  testnet: boolean;
}

export interface BatchDecodeParams {
  transactionHash: string;
  batchIndex?: number;
  initialStateDiffs?: boolean;
}

export interface BatchDecodeResponse {
  network: string;
  chainId: number;
  data: Record<string, any>;
}

export interface BlobArchiveParams {
  versionedHash: string;
  includeData?: boolean;
}

export interface BlobResponse {
  blob: {
    versionedHash: string;
    commitment: string;
    proof: string;
    zeroBytes: number;
    nonZeroBytes: number;
    data: string;
  };
}

export class BlocknativeClient {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  async getGasPrices(params?: GasPriceParams): Promise<GasPriceResponse> {
    let queryParams: Record<string, string> = {};

    if (params?.chainId !== undefined) {
      queryParams.chainid = String(params.chainId);
    }
    if (params?.system) {
      queryParams.system = params.system;
    }
    if (params?.network) {
      queryParams.network = params.network;
    }
    if (params?.confidenceLevels && params.confidenceLevels.length > 0) {
      queryParams.confidenceLevels = params.confidenceLevels.join(',');
    }

    let response = await gasApi.get('/gasprices/blockprices', {
      params: queryParams,
      headers: this.authHeader()
    });

    return response.data;
  }

  async getGasDistribution(): Promise<GasDistributionResponse> {
    let response = await gasApi.get('/gasprices/distribution', {
      headers: this.authHeader()
    });

    return response.data;
  }

  async getBaseFeeEstimates(): Promise<BaseFeeEstimatesResponse> {
    let response = await gasApi.get('/gasprices/basefee-estimates', {
      headers: {
        'X-Api-Key': this.token
      }
    });

    return response.data;
  }

  async getChains(): Promise<ChainInfo[]> {
    let response = await gasApi.get('/chains', {
      headers: this.authHeader()
    });

    return response.data;
  }

  async getOracles(): Promise<OracleInfo[]> {
    let response = await gasApi.get('/oracles', {
      headers: this.authHeader()
    });

    return response.data;
  }

  async decodeBatch(params: BatchDecodeParams): Promise<BatchDecodeResponse> {
    let queryParams: Record<string, string> = {};

    if (params.batchIndex !== undefined) {
      queryParams.batchIndex = String(params.batchIndex);
    }
    if (params.initialStateDiffs !== undefined) {
      queryParams.initialStateDiffs = String(params.initialStateDiffs);
    }

    let response = await ethernowApi.get(`/v1/batch/${params.transactionHash}`, {
      params: queryParams
    });

    return response.data;
  }

  async getBlob(params: BlobArchiveParams): Promise<BlobResponse> {
    let queryParams: Record<string, string> = {};

    if (params.includeData !== undefined) {
      queryParams.data = String(params.includeData);
    }

    let response = await ethernowApi.get(`/v1/blob/${params.versionedHash}`, {
      params: queryParams
    });

    return response.data;
  }

  private authHeader(): Record<string, string> {
    if (this.token) {
      return { Authorization: this.token };
    }
    return {};
  }
}
