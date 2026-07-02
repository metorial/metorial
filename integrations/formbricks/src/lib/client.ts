import { createAxios } from 'slates';

export class Client {
  private http: ReturnType<typeof createAxios>;

  constructor(params: { token: string; baseUrl: string }) {
    this.http = createAxios({
      baseURL: `${params.baseUrl}/api/v1`,
      headers: {
        'x-api-key': params.token,
        'Content-Type': 'application/json'
      }
    });
  }

  // Account
  async getMe(): Promise<any> {
    let response = await this.http.get('/management/me');
    return response.data?.data;
  }

  // Surveys
  async listSurveys(params?: { limit?: number; offset?: number }): Promise<any[]> {
    let query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    let queryStr = query.toString();
    let response = await this.http.get(`/management/surveys${queryStr ? `?${queryStr}` : ''}`);
    return response.data?.data ?? [];
  }

  async getSurvey(surveyId: string): Promise<any> {
    let response = await this.http.get(`/management/surveys/${surveyId}`);
    return response.data?.data;
  }

  async createSurvey(data: Record<string, any>): Promise<any> {
    let response = await this.http.post('/management/surveys', data);
    return response.data?.data;
  }

  async updateSurvey(surveyId: string, data: Record<string, any>): Promise<any> {
    let response = await this.http.put(`/management/surveys/${surveyId}`, data);
    return response.data?.data;
  }

  async deleteSurvey(surveyId: string): Promise<any> {
    let response = await this.http.delete(`/management/surveys/${surveyId}`);
    return response.data?.data;
  }

  // Responses
  async listResponses(
    surveyId: string,
    params?: { limit?: number; offset?: number }
  ): Promise<any[]> {
    let query = new URLSearchParams();
    query.set('surveyId', surveyId);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    let response = await this.http.get(`/management/responses?${query.toString()}`);
    return response.data?.data ?? [];
  }

  async getResponse(responseId: string): Promise<any> {
    let response = await this.http.get(`/management/responses/${responseId}`);
    return response.data?.data;
  }

  async createResponse(data: Record<string, any>): Promise<any> {
    let response = await this.http.post('/management/responses', data);
    return response.data?.data;
  }

  async updateResponse(responseId: string, data: Record<string, any>): Promise<any> {
    let response = await this.http.put(`/management/responses/${responseId}`, data);
    return response.data?.data;
  }

  async deleteResponse(responseId: string): Promise<any> {
    let response = await this.http.delete(`/management/responses/${responseId}`);
    return response.data?.data;
  }

  // Contacts
  async listContacts(params?: { limit?: number; offset?: number }): Promise<any[]> {
    let query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    let queryStr = query.toString();
    let response = await this.http.get(
      `/management/contacts${queryStr ? `?${queryStr}` : ''}`
    );
    return response.data?.data ?? [];
  }

  async getContact(contactId: string): Promise<any> {
    let response = await this.http.get(`/management/contacts/${contactId}`);
    return response.data?.data;
  }

  // People
  async listPeople(params?: { limit?: number; offset?: number }): Promise<any[]> {
    let query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    let queryStr = query.toString();
    let response = await this.http.get(`/management/people${queryStr ? `?${queryStr}` : ''}`);
    return response.data?.data ?? [];
  }

  async getPerson(personId: string): Promise<any> {
    let response = await this.http.get(`/management/people/${personId}`);
    return response.data?.data;
  }

  async deletePerson(personId: string): Promise<any> {
    let response = await this.http.delete(`/management/people/${personId}`);
    return response.data?.data;
  }

  // Action Classes
  async listActionClasses(): Promise<any[]> {
    let response = await this.http.get('/management/action-classes');
    return response.data?.data ?? [];
  }

  async createActionClass(data: Record<string, any>): Promise<any> {
    let response = await this.http.post('/management/action-classes', data);
    return response.data?.data;
  }

  async deleteActionClass(actionClassId: string): Promise<any> {
    let response = await this.http.delete(`/management/action-classes/${actionClassId}`);
    return response.data?.data;
  }

  // Attribute Classes
  async listAttributeClasses(): Promise<any[]> {
    let response = await this.http.get('/management/attribute-classes');
    return response.data?.data ?? [];
  }

  async createAttributeClass(data: Record<string, any>): Promise<any> {
    let response = await this.http.post('/management/attribute-classes', data);
    return response.data?.data;
  }

  async deleteAttributeClass(attributeClassId: string): Promise<any> {
    let response = await this.http.delete(`/management/attribute-classes/${attributeClassId}`);
    return response.data?.data;
  }

  // Webhooks
  async listWebhooks(): Promise<any[]> {
    let response = await this.http.get('/webhooks');
    return response.data?.data ?? [];
  }

  async getWebhook(webhookId: string): Promise<any> {
    let response = await this.http.get(`/webhooks/${webhookId}`);
    return response.data?.data;
  }

  async createWebhook(data: {
    url: string;
    triggers: string[];
    surveyIds?: string[];
  }): Promise<any> {
    let response = await this.http.post('/webhooks', data);
    return response.data?.data;
  }

  async deleteWebhook(webhookId: string): Promise<any> {
    let response = await this.http.delete(`/webhooks/${webhookId}`);
    return response.data?.data;
  }

  // Contact Attribute Keys
  async listContactAttributeKeys(): Promise<any[]> {
    let response = await this.http.get('/management/contact-attribute-keys');
    return response.data?.data ?? [];
  }
}
