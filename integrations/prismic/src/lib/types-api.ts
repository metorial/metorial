import { createAxios } from 'slates';

export interface TypesApiConfig {
  repositoryName: string;
  writeToken: string;
}

export interface CustomType {
  id: string;
  label: string;
  repeatable: boolean;
  status: boolean;
  json: Record<string, any>;
}

export interface SharedSlice {
  id: string;
  type: string;
  name: string;
  description?: string;
  variations: {
    id: string;
    name: string;
    description?: string;
    docURL?: string;
    version?: string;
    primary?: Record<string, any>;
    items?: Record<string, any>;
    imageUrl?: string;
  }[];
}

export class TypesApiClient {
  private repositoryName: string;
  private writeToken: string;

  constructor(config: TypesApiConfig) {
    this.repositoryName = config.repositoryName;
    this.writeToken = config.writeToken;
  }

  private getAxios() {
    return createAxios({
      baseURL: 'https://customtypes.prismic.io',
      headers: {
        Authorization: `Bearer ${this.writeToken}`,
        repository: this.repositoryName,
        'Content-Type': 'application/json'
      }
    });
  }

  // Custom Types

  async listCustomTypes(): Promise<CustomType[]> {
    let axios = this.getAxios();
    let response = await axios.get('/customtypes');
    return response.data as CustomType[];
  }

  async getCustomType(typeId: string): Promise<CustomType> {
    let axios = this.getAxios();
    let response = await axios.get(`/customtypes/${typeId}`);
    return response.data as CustomType;
  }

  async createCustomType(customType: CustomType): Promise<CustomType> {
    let axios = this.getAxios();
    let response = await axios.post('/customtypes/insert', customType);
    return response.data as CustomType;
  }

  async updateCustomType(customType: CustomType): Promise<CustomType> {
    let axios = this.getAxios();
    let response = await axios.post('/customtypes/update', customType);
    return response.data as CustomType;
  }

  async deleteCustomType(typeId: string): Promise<void> {
    let axios = this.getAxios();
    await axios.delete(`/customtypes/${typeId}`);
  }

  // Shared Slices

  async listSharedSlices(): Promise<SharedSlice[]> {
    let axios = this.getAxios();
    let response = await axios.get('/slices');
    return response.data as SharedSlice[];
  }

  async getSharedSlice(sliceId: string): Promise<SharedSlice> {
    let axios = this.getAxios();
    let response = await axios.get(`/slices/${sliceId}`);
    return response.data as SharedSlice;
  }

  async createSharedSlice(slice: SharedSlice): Promise<SharedSlice> {
    let axios = this.getAxios();
    let response = await axios.post('/slices/insert', slice);
    return response.data as SharedSlice;
  }

  async updateSharedSlice(slice: SharedSlice): Promise<SharedSlice> {
    let axios = this.getAxios();
    let response = await axios.post('/slices/update', slice);
    return response.data as SharedSlice;
  }

  async deleteSharedSlice(sliceId: string): Promise<void> {
    let axios = this.getAxios();
    await axios.delete(`/slices/${sliceId}`);
  }
}
