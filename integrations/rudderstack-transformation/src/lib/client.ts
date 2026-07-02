import { createAxios } from 'slates';

let BASE_URLS: Record<string, string> = {
  us: 'https://api.rudderstack.com',
  eu: 'https://api.eu.rudderstack.com'
};

export class Client {
  private http;

  constructor(private config: { token: string; region: string }) {
    let baseURL = BASE_URLS[config.region] ?? BASE_URLS.us;
    this.http = createAxios({ baseURL });
  }

  private get headers() {
    let encoded = btoa(`:${this.config.token}`);
    return {
      Authorization: `Basic ${encoded}`,
      'Content-Type': 'application/json'
    };
  }

  // --- Transformations ---

  async createTransformation(params: {
    name: string;
    code: string;
    language: string;
    description?: string;
    publish?: boolean;
    destinationIds?: string[];
  }) {
    let query = params.publish ? '?publish=true' : '';
    let body: Record<string, any> = {
      name: params.name,
      code: params.code,
      language: params.language
    };
    if (params.description !== undefined) body.description = params.description;
    if (params.publish && params.destinationIds && params.destinationIds.length > 0) {
      body.destinationIds = params.destinationIds;
    }

    let response = await this.http.post(`/transformations${query}`, body, {
      headers: this.headers
    });
    return response.data;
  }

  async getTransformation(transformationId: string) {
    let response = await this.http.get(`/transformations/${transformationId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async listTransformations() {
    let response = await this.http.get('/transformations', {
      headers: this.headers
    });
    return response.data;
  }

  async updateTransformation(
    transformationId: string,
    params: {
      name?: string;
      code?: string;
      description?: string;
      publish?: boolean;
      destinationIds?: string[];
    }
  ) {
    let query = params.publish ? '?publish=true' : '';
    let body: Record<string, any> = {};
    if (params.name !== undefined) body.name = params.name;
    if (params.code !== undefined) body.code = params.code;
    if (params.description !== undefined) body.description = params.description;
    if (params.publish && params.destinationIds && params.destinationIds.length > 0) {
      body.destinationIds = params.destinationIds;
    }

    let response = await this.http.put(`/transformations/${transformationId}${query}`, body, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteTransformation(transformationId: string) {
    let response = await this.http.delete(`/transformations/${transformationId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async listTransformationVersions(
    transformationId: string,
    params?: {
      count?: number;
      orderBy?: 'asc' | 'desc';
    }
  ) {
    let query: Record<string, any> = {};
    if (params?.count !== undefined) query.count = params.count;
    if (params?.orderBy !== undefined) query.orderBy = params.orderBy;

    let response = await this.http.get(`/transformations/${transformationId}/versions`, {
      headers: this.headers,
      params: query
    });
    return response.data;
  }

  async getTransformationVersion(transformationId: string, versionId: string) {
    let response = await this.http.get(
      `/transformations/${transformationId}/versions/${versionId}`,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  // --- Libraries ---

  async createLibrary(params: {
    name: string;
    code: string;
    language: string;
    description?: string;
  }) {
    let body: Record<string, any> = {
      name: params.name,
      code: params.code,
      language: params.language
    };
    if (params.description !== undefined) body.description = params.description;

    let response = await this.http.post('/libraries', body, {
      headers: this.headers
    });
    return response.data;
  }

  async getLibrary(libraryId: string) {
    let response = await this.http.get(`/libraries/${libraryId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async listLibraries() {
    let response = await this.http.get('/libraries', {
      headers: this.headers
    });
    return response.data;
  }

  async updateLibrary(
    libraryId: string,
    params: {
      description?: string;
      code?: string;
      publish?: boolean;
    }
  ) {
    let query = params.publish ? '?publish=true' : '';
    let body: Record<string, any> = {};
    if (params.description !== undefined) body.description = params.description;
    if (params.code !== undefined) body.code = params.code;

    let response = await this.http.post(`/libraries/${libraryId}${query}`, body, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteLibrary(libraryId: string) {
    let response = await this.http.delete(`/libraries/${libraryId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async listLibraryVersions(
    libraryId: string,
    params?: {
      count?: number;
      orderBy?: 'asc' | 'desc';
    }
  ) {
    let query: Record<string, any> = {};
    if (params?.count !== undefined) query.count = params.count;
    if (params?.orderBy !== undefined) query.orderBy = params.orderBy;

    let response = await this.http.get(`/libraries/${libraryId}/versions`, {
      headers: this.headers,
      params: query
    });
    return response.data;
  }

  async getLibraryVersion(libraryId: string, versionId: string) {
    let response = await this.http.get(`/libraries/${libraryId}/versions/${versionId}`, {
      headers: this.headers
    });
    return response.data;
  }

  // --- Publish ---

  async publish(params: {
    transformations?: Array<{
      versionId: string;
      testInput?: any[];
    }>;
    libraries?: Array<{
      versionId: string;
    }>;
  }) {
    let body: Record<string, any> = {};
    if (params.transformations) body.transformations = params.transformations;
    if (params.libraries) body.libraries = params.libraries;

    let response = await this.http.post('/libraries/publish', body, {
      headers: this.headers
    });
    return response.data;
  }
}
