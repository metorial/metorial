import { createAxios } from 'slates';

let BASE_URL = 'https://public.ecologi.com';

export interface PurchaseTreesRequest {
  number: number;
  name?: string;
  test?: boolean;
}

export interface PurchaseTreesResponse {
  amount: number;
  currency: string;
  treeUrl: string;
  name: string;
}

export interface PurchaseCarbonRequest {
  number: number;
  units: 'KG' | 'Tonnes';
  test?: boolean;
}

export interface PurchaseCarbonResponse {
  number: number;
  units: string;
  numberInTonnes: number;
  amount: number;
  currency: string;
}

export interface TreesResponse {
  total: number;
  pending: number;
}

export interface CarbonOffsetResponse {
  total: number;
  pending: number;
}

export interface ImpactResponse {
  trees: number;
  carbonOffset: number;
  treesIncPending?: number;
  carbonOffsetIncPending?: number;
}

export class EcologiClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(token?: string) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
  }

  async purchaseTrees(request: PurchaseTreesRequest): Promise<PurchaseTreesResponse> {
    let response = await this.axios.post<PurchaseTreesResponse>('/impact/trees', request);
    return response.data;
  }

  async purchaseCarbon(request: PurchaseCarbonRequest): Promise<PurchaseCarbonResponse> {
    let response = await this.axios.post<PurchaseCarbonResponse>('/impact/carbon', request);
    return response.data;
  }

  async getTrees(username: string): Promise<TreesResponse> {
    let response = await this.axios.get<TreesResponse>(
      `/users/${encodeURIComponent(username)}/trees`
    );
    return response.data;
  }

  async getCarbonOffset(username: string): Promise<CarbonOffsetResponse> {
    let response = await this.axios.get<CarbonOffsetResponse>(
      `/users/${encodeURIComponent(username)}/carbon-offset`
    );
    return response.data;
  }

  async getImpact(username: string): Promise<ImpactResponse> {
    let response = await this.axios.get<ImpactResponse>(
      `/users/${encodeURIComponent(username)}/impact`
    );
    return response.data;
  }
}
