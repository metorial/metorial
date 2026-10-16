import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';

export interface PurchaseOptions {
  name?: string;
  test?: boolean;
  recipientEmail?: string;
}

export interface PurchaseTreesRequest extends PurchaseOptions {
  number: number;
}

export interface PurchaseResponse extends Record<string, unknown> {
  amount: number;
  currency: string;
  name?: string;
  recipientEmail?: string;
  projectDetails?: Record<string, unknown>[];
  tileUrl?: string;
}

export interface PurchaseTreesResponse extends PurchaseResponse {
  treeUrl: string;
  name: string;
}

export interface PurchaseCarbonRequest extends PurchaseOptions {
  number: number;
  units: 'KG' | 'Tonnes';
}

export interface PurchaseCarbonResponse extends PurchaseResponse {
  number: number;
  units: string;
  numberInTonnes: number;
}

export interface MetricResponse extends Record<string, unknown> {
  total: number;
  pending: number;
}

export interface ImpactResponse extends Record<string, unknown> {
  trees: number;
  carbonOffset: number;
  carbonRemoval?: number;
  habitatRestoration?: number;
  pending?: {
    trees?: number;
    carbonOffset?: number;
    carbonRemoval?: number;
    habitatRestoration?: number;
  };
}

export class EcologiClient {
  private axios: ReturnType<typeof createAuthenticatedAxios>;
  private token?: string;

  constructor(token?: string) {
    this.token = token?.trim();
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://public.ecologi.com',
      authHeader: this.token ? { value: `Bearer ${this.token}` } : undefined,
      timeout: 30_000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Ecologi',
          reason: 'ecologi_api_error',
          extractResponse: (error, helpers) => helpers.getResponseWithBody(error)
        })
    });
  }

  private async purchase<T extends PurchaseResponse>(
    path: string,
    request: PurchaseOptions & { number: number },
    idempotencyKey?: string
  ): Promise<T> {
    if (!this.token) {
      throw createApiServiceError(
        'An Ecologi API key is required to purchase impact. Connect using API Key authentication.',
        { reason: 'ecologi_missing_api_key' }
      );
    }
    let response = await this.axios.post<T>(path, pickDefined(request), {
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined
    });
    return response.data;
  }

  purchaseTrees(request: PurchaseTreesRequest, idempotencyKey?: string) {
    return this.purchase<PurchaseTreesResponse>('/impact/trees', request, idempotencyKey);
  }

  purchaseLocalTrees(
    request: PurchaseTreesRequest & { country: 'UK' | 'US' | 'AU' | 'BR' },
    idempotencyKey?: string
  ) {
    return this.purchase<PurchaseTreesResponse>(
      '/impact/local-trees',
      request,
      idempotencyKey
    );
  }

  purchaseCarbon(request: PurchaseCarbonRequest, idempotencyKey?: string) {
    return this.purchase<PurchaseCarbonResponse>('/impact/carbon', request, idempotencyKey);
  }

  purchaseCarbonRemoval(request: PurchaseTreesRequest, idempotencyKey?: string) {
    return this.purchase<PurchaseResponse>('/impact/carbon-removal', request, idempotencyKey);
  }

  purchaseHabitatRestoration(request: PurchaseTreesRequest, idempotencyKey?: string) {
    return this.purchase<PurchaseResponse>(
      '/impact/habitat-restoration',
      request,
      idempotencyKey
    );
  }

  async getMetric(
    username: string,
    metric: 'trees' | 'carbon-offset' | 'carbon-removal' | 'habitat-restoration'
  ): Promise<MetricResponse> {
    let response = await this.axios.get<MetricResponse>(
      `/users/${encodeURIComponent(username)}/${metric}`
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
