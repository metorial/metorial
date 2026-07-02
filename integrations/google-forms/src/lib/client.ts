import { createAxios } from 'slates';
import type {
  GoogleForm,
  GoogleFormResponse,
  GoogleFormsBatchUpdateRequest,
  GoogleFormsBatchUpdateResponse,
  GoogleFormsListResponsesResult,
  GoogleFormsListWatchesResult,
  GoogleFormsWatch
} from './types';

export class GoogleFormsClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.axios = createAxios({
      baseURL: 'https://forms.googleapis.com/v1',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── Forms ──────────────────────────────────────────────────────

  async createForm(title: string, documentTitle?: string): Promise<GoogleForm> {
    let body: any = {
      info: { title }
    };
    if (documentTitle) {
      body.info.documentTitle = documentTitle;
    }

    let response = await this.axios.post('/forms', body);
    return response.data as GoogleForm;
  }

  async getForm(formId: string): Promise<GoogleForm> {
    let response = await this.axios.get(`/forms/${formId}`);
    return response.data as GoogleForm;
  }

  async batchUpdate(
    formId: string,
    request: GoogleFormsBatchUpdateRequest
  ): Promise<GoogleFormsBatchUpdateResponse> {
    let response = await this.axios.post(`/forms/${formId}:batchUpdate`, request);
    return response.data as GoogleFormsBatchUpdateResponse;
  }

  // ─── Responses ──────────────────────────────────────────────────

  async getResponse(formId: string, responseId: string): Promise<GoogleFormResponse> {
    let response = await this.axios.get(`/forms/${formId}/responses/${responseId}`);
    return response.data as GoogleFormResponse;
  }

  async listResponses(
    formId: string,
    params?: {
      filter?: string;
      pageSize?: number;
      pageToken?: string;
    }
  ): Promise<GoogleFormsListResponsesResult> {
    let query: Record<string, any> = {};
    if (params?.filter) query.filter = params.filter;
    if (params?.pageSize) query.pageSize = params.pageSize;
    if (params?.pageToken) query.pageToken = params.pageToken;

    let response = await this.axios.get(`/forms/${formId}/responses`, { params: query });
    return response.data as GoogleFormsListResponsesResult;
  }

  async listAllResponses(formId: string, filter?: string): Promise<GoogleFormResponse[]> {
    let allResponses: GoogleFormResponse[] = [];
    let pageToken: string | undefined;

    do {
      let result = await this.listResponses(formId, {
        filter,
        pageSize: 5000,
        pageToken
      });

      if (result.responses) {
        allResponses.push(...result.responses);
      }
      pageToken = result.nextPageToken;
    } while (pageToken);

    return allResponses;
  }

  // ─── Watches ────────────────────────────────────────────────────

  async createWatch(
    formId: string,
    eventType: string,
    topicName: string,
    watchId?: string
  ): Promise<GoogleFormsWatch> {
    let body: any = {
      watch: {
        eventType,
        target: {
          topic: { topicName }
        }
      }
    };
    if (watchId) {
      body.watchId = watchId;
    }

    let response = await this.axios.post(`/forms/${formId}/watches`, body);
    return response.data as GoogleFormsWatch;
  }

  async deleteWatch(formId: string, watchId: string): Promise<void> {
    await this.axios.delete(`/forms/${formId}/watches/${watchId}`);
  }

  async listWatches(formId: string): Promise<GoogleFormsWatch[]> {
    let response = await this.axios.get(`/forms/${formId}/watches`);
    let data = response.data as GoogleFormsListWatchesResult;
    return data.watches || [];
  }

  async renewWatch(formId: string, watchId: string): Promise<GoogleFormsWatch> {
    let response = await this.axios.post(`/forms/${formId}/watches/${watchId}:renew`);
    return response.data as GoogleFormsWatch;
  }
}
