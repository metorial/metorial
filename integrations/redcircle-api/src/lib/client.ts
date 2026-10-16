import { buildApiServiceError, createAuthenticatedAxios } from 'slates';

export class Client {
  private apiKey: string;
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    this.apiKey = config.token;
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.redcircleapi.com',
      timeout: 180_000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'RedCircle',
          reason: 'redcircle_api_error',
          extractResponse: (error, helpers) => helpers.getResponseWithBody(error),
          nestedKeys: ['request_info', 'errors']
        })
    });
    this.axios.interceptors.response.use(response => {
      if (response.data?.request_info?.success === false) {
        throw buildApiServiceError(
          { response },
          {
            providerLabel: 'RedCircle',
            reason: 'redcircle_api_error',
            nestedKeys: ['request_info', 'errors'],
            fallbackMessage: 'The provider did not complete the request.'
          }
        );
      }
      return response;
    });
  }

  private withApiKey(params: Record<string, any> = {}): Record<string, any> {
    return { ...params, api_key: this.apiKey };
  }

  // ──────────────────────────────────────────
  // Product Data API (/request)
  // ──────────────────────────────────────────

  async searchProducts(params: Record<string, any>): Promise<any> {
    let response = await this.axios.get('/request', {
      params: this.withApiKey({ type: 'search', ...params })
    });
    return response.data;
  }

  async getProduct(params: Record<string, any>): Promise<any> {
    let response = await this.axios.get('/request', {
      params: this.withApiKey({ type: 'product', ...params })
    });
    return response.data;
  }

  async getReviews(params: Record<string, any>): Promise<any> {
    let response = await this.axios.get('/request', {
      params: this.withApiKey({ type: 'reviews', ...params })
    });
    return response.data;
  }

  async getCategoryProducts(params: Record<string, any>): Promise<any> {
    let response = await this.axios.get('/request', {
      params: this.withApiKey({ type: 'category', ...params })
    });
    return response.data;
  }

  async getStoreStock(params: Record<string, any>): Promise<any> {
    let response = await this.axios.get('/request', {
      params: this.withApiKey({ type: 'store_stock', ...params })
    });
    return response.data;
  }

  // ──────────────────────────────────────────
  // Categories API
  // ──────────────────────────────────────────

  async listCategories(params: Record<string, any> = {}): Promise<any> {
    let response = await this.axios.get('/categories', {
      params: this.withApiKey(params)
    });
    return response.data;
  }

  // ──────────────────────────────────────────
  // Zipcodes API
  // ──────────────────────────────────────────

  async listZipcodes(params: Record<string, any> = {}): Promise<any> {
    let response = await this.axios.get('/zipcodes', {
      params: this.withApiKey(params)
    });
    return response.data;
  }

  async addZipcodes(zipcodes: Array<{ zipcode: string; domain?: string }>): Promise<any> {
    let response = await this.axios.post('/zipcodes', zipcodes, {
      params: this.withApiKey()
    });
    return response.data;
  }

  async deleteZipcodes(zipcodes: Array<{ zipcode: string; domain?: string }>): Promise<any> {
    let response = await this.axios.delete('/zipcodes', {
      params: this.withApiKey(),
      data: zipcodes
    });
    return response.data;
  }

  // ──────────────────────────────────────────
  // Collections API
  // ──────────────────────────────────────────

  async listCollections(params: Record<string, any> = {}): Promise<any> {
    let response = await this.axios.get('/collections', {
      params: this.withApiKey(params)
    });
    return response.data;
  }

  async getCollection(collectionId: string): Promise<any> {
    let response = await this.axios.get(`/collections/${encodeURIComponent(collectionId)}`, {
      params: this.withApiKey()
    });
    return response.data;
  }

  async createCollection(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/collections', data, {
      params: this.withApiKey()
    });
    return response.data;
  }

  async updateCollection(collectionId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(
      `/collections/${encodeURIComponent(collectionId)}`,
      data,
      {
        params: this.withApiKey()
      }
    );
    return response.data;
  }

  async deleteCollection(collectionId: string): Promise<any> {
    let response = await this.axios.delete(
      `/collections/${encodeURIComponent(collectionId)}`,
      {
        params: this.withApiKey()
      }
    );
    return response.data;
  }

  async startCollection(collectionId: string): Promise<any> {
    let response = await this.axios.get(
      `/collections/${encodeURIComponent(collectionId)}/start`,
      {
        params: this.withApiKey()
      }
    );
    return response.data;
  }

  async listCollectionRequests(collectionId: string, page: number): Promise<any> {
    let response = await this.axios.get(
      `/collections/${encodeURIComponent(collectionId)}/requests/${page}`,
      { params: this.withApiKey() }
    );
    return response.data;
  }

  async addCollectionRequests(
    collectionId: string,
    requests: Record<string, unknown>[]
  ): Promise<any> {
    return this.updateCollection(collectionId, { requests });
  }

  async updateCollectionRequest(
    collectionId: string,
    requestId: string,
    parameters: Record<string, unknown>
  ): Promise<any> {
    let response = await this.axios.put(
      `/collections/${encodeURIComponent(collectionId)}/${encodeURIComponent(requestId)}`,
      parameters,
      { params: this.withApiKey() }
    );
    return response.data;
  }

  async deleteCollectionRequest(collectionId: string, requestId: string): Promise<any> {
    let response = await this.axios.delete(
      `/collections/${encodeURIComponent(collectionId)}/${encodeURIComponent(requestId)}`,
      { params: this.withApiKey() }
    );
    return response.data;
  }

  // ──────────────────────────────────────────
  // Result Sets API
  // ──────────────────────────────────────────

  async listResultSets(collectionId: string): Promise<any> {
    let response = await this.axios.get(
      `/collections/${encodeURIComponent(collectionId)}/results`,
      {
        params: this.withApiKey()
      }
    );
    return response.data;
  }

  async getResultSet(
    collectionId: string,
    resultSetId: string,
    format: 'json' | 'jsonlines' | 'csv' = 'json',
    csvFields?: string
  ): Promise<any> {
    let path = `/collections/${encodeURIComponent(collectionId)}/results/${encodeURIComponent(resultSetId)}`;
    if (format === 'jsonlines') path += '/jsonlines';
    if (format === 'csv') path += '/csv';

    let params: Record<string, any> = {};
    if (format === 'csv' && csvFields) {
      params.csv_fields = csvFields;
    }

    let response = await this.axios.get(path, {
      params: this.withApiKey(params)
    });
    return response.data;
  }

  async resendWebhook(collectionId: string, resultSetId: string): Promise<any> {
    let response = await this.axios.get(
      `/collections/${encodeURIComponent(collectionId)}/results/${encodeURIComponent(resultSetId)}/resendwebhook`,
      {
        params: this.withApiKey()
      }
    );
    return response.data;
  }

  // ──────────────────────────────────────────
  // Destinations API
  // ──────────────────────────────────────────

  async listDestinations(params: Record<string, any> = {}): Promise<any> {
    let response = await this.axios.get('/destinations', {
      params: this.withApiKey(params)
    });
    return response.data;
  }

  async createDestination(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/destinations', data, {
      params: this.withApiKey()
    });
    return response.data;
  }

  async updateDestination(destinationId: string, data: Record<string, any>): Promise<any> {
    let response = await this.axios.put(
      `/destinations/${encodeURIComponent(destinationId)}`,
      data,
      {
        params: this.withApiKey()
      }
    );
    return response.data;
  }

  async deleteDestination(destinationId: string): Promise<any> {
    let response = await this.axios.delete(
      `/destinations/${encodeURIComponent(destinationId)}`,
      {
        params: this.withApiKey()
      }
    );
    return response.data;
  }

  // ──────────────────────────────────────────
  // Account API
  // ──────────────────────────────────────────

  async getAccount(): Promise<any> {
    let response = await this.axios.get('/account', {
      params: this.withApiKey()
    });
    return response.data;
  }
}
