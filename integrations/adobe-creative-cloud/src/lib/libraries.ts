import { type AdobeAuthConfig, createAdobeAxios } from './client';

let LIBRARIES_BASE_URL = 'https://cc-libraries.adobe.io';

export class LibrariesClient {
  private http;

  constructor(auth: AdobeAuthConfig) {
    this.http = createAdobeAxios(LIBRARIES_BASE_URL, auth);
  }

  async listLibraries(params?: { limit?: number; start?: string }) {
    let response = await this.http.get('/api/v1/libraries', {
      params: {
        limit: params?.limit || 50,
        ...(params?.start ? { start: params.start } : {})
      }
    });
    return response.data;
  }

  async getLibrary(libraryId: string) {
    let response = await this.http.get(`/api/v1/libraries/${libraryId}`);
    return response.data;
  }

  async createLibrary(name: string) {
    let response = await this.http.post('/api/v1/libraries', { name });
    return response.data;
  }

  async deleteLibrary(libraryId: string) {
    let response = await this.http.delete(`/api/v1/libraries/${libraryId}`);
    return response.data;
  }

  async listElements(libraryId: string, params?: { limit?: number; start?: string }) {
    let response = await this.http.get(`/api/v1/libraries/${libraryId}/elements`, {
      params: {
        limit: params?.limit || 50,
        ...(params?.start ? { start: params.start } : {})
      }
    });
    return response.data;
  }

  async getElement(libraryId: string, elementId: string) {
    let response = await this.http.get(`/api/v1/libraries/${libraryId}/elements/${elementId}`);
    return response.data;
  }

  async createElement(
    libraryId: string,
    element: {
      name: string;
      type: string;
      representations?: any[];
    }
  ) {
    let response = await this.http.post(`/api/v1/libraries/${libraryId}/elements`, element);
    return response.data;
  }

  async deleteElement(libraryId: string, elementId: string) {
    let response = await this.http.delete(
      `/api/v1/libraries/${libraryId}/elements/${elementId}`
    );
    return response.data;
  }
}
