import { createAxios } from 'slates';

export interface ClientConfig {
  token: string;
  environment?: 'production' | 'sandbox';
}

export class Client {
  private http: ReturnType<typeof createAxios>;

  constructor(config: ClientConfig) {
    let baseURL =
      config.environment === 'sandbox'
        ? 'https://api.sandbox.lever.co/v1'
        : 'https://api.lever.co/v1';

    this.http = createAxios({
      baseURL,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── Opportunities ───

  async listOpportunities(params?: Record<string, any>): Promise<any> {
    let response = await this.http.get('/opportunities', { params });
    return response.data;
  }

  async getOpportunity(opportunityId: string, params?: Record<string, any>): Promise<any> {
    let response = await this.http.get(`/opportunities/${opportunityId}`, { params });
    return response.data;
  }

  async createOpportunity(data: Record<string, any>): Promise<any> {
    let response = await this.http.post('/opportunities', data);
    return response.data;
  }

  async updateOpportunity(opportunityId: string, data: Record<string, any>): Promise<any> {
    let response = await this.http.put(`/opportunities/${opportunityId}`, data);
    return response.data;
  }

  async updateOpportunityStage(opportunityId: string, stageId: string): Promise<any> {
    let response = await this.http.put(`/opportunities/${opportunityId}/stage`, {
      stage: stageId
    });
    return response.data;
  }

  async updateOpportunityArchived(opportunityId: string, reasonId?: string): Promise<any> {
    let body: Record<string, any> = {};
    if (reasonId) {
      body.reason = reasonId;
    }
    let response = await this.http.put(`/opportunities/${opportunityId}/archived`, body);
    return response.data;
  }

  async deleteOpportunityArchived(opportunityId: string): Promise<any> {
    let response = await this.http.delete(`/opportunities/${opportunityId}/archived`);
    return response.data;
  }

  async addOpportunityTags(opportunityId: string, tags: string[]): Promise<any> {
    let response = await this.http.post(`/opportunities/${opportunityId}/addTags`, { tags });
    return response.data;
  }

  async removeOpportunityTags(opportunityId: string, tags: string[]): Promise<any> {
    let response = await this.http.post(`/opportunities/${opportunityId}/removeTags`, {
      tags
    });
    return response.data;
  }

  async addOpportunityLinks(opportunityId: string, links: string[]): Promise<any> {
    let response = await this.http.post(`/opportunities/${opportunityId}/addLinks`, { links });
    return response.data;
  }

  async removeOpportunityLinks(opportunityId: string, links: string[]): Promise<any> {
    let response = await this.http.post(`/opportunities/${opportunityId}/removeLinks`, {
      links
    });
    return response.data;
  }

  async addOpportunitySources(opportunityId: string, sources: string[]): Promise<any> {
    let response = await this.http.post(`/opportunities/${opportunityId}/addSources`, {
      sources
    });
    return response.data;
  }

  async removeOpportunitySources(opportunityId: string, sources: string[]): Promise<any> {
    let response = await this.http.post(`/opportunities/${opportunityId}/removeSources`, {
      sources
    });
    return response.data;
  }

  // ─── Applications ───

  async listOpportunityApplications(opportunityId: string): Promise<any> {
    let response = await this.http.get(`/opportunities/${opportunityId}/applications`);
    return response.data;
  }

  // ─── Contacts ───

  async getContact(contactId: string): Promise<any> {
    let response = await this.http.get(`/contacts/${contactId}`);
    return response.data;
  }

  async updateContact(contactId: string, data: Record<string, any>): Promise<any> {
    let response = await this.http.put(`/contacts/${contactId}`, data);
    return response.data;
  }

  // ─── Postings ───

  async listPostings(params?: Record<string, any>): Promise<any> {
    let response = await this.http.get('/postings', { params });
    return response.data;
  }

  async getPosting(postingId: string): Promise<any> {
    let response = await this.http.get(`/postings/${postingId}`);
    return response.data;
  }

  async createPosting(data: Record<string, any>): Promise<any> {
    let response = await this.http.post('/postings', data);
    return response.data;
  }

  async updatePosting(postingId: string, data: Record<string, any>): Promise<any> {
    let response = await this.http.put(`/postings/${postingId}`, data);
    return response.data;
  }

  async getPostingApplyQuestions(postingId: string): Promise<any> {
    let response = await this.http.get(`/postings/${postingId}/apply`);
    return response.data;
  }

  async submitPostingApplication(postingId: string, data: Record<string, any>): Promise<any> {
    let response = await this.http.post(`/postings/${postingId}/apply`, data);
    return response.data;
  }

  // ─── Interviews & Panels ───

  async listOpportunityInterviews(opportunityId: string): Promise<any> {
    let response = await this.http.get(`/opportunities/${opportunityId}/interviews`);
    return response.data;
  }

  async getInterview(interviewId: string): Promise<any> {
    let response = await this.http.get(`/interviews/${interviewId}`);
    return response.data;
  }

  async createInterview(
    opportunityId: string,
    panelId: string,
    data: Record<string, any>
  ): Promise<any> {
    let response = await this.http.post(
      `/opportunities/${opportunityId}/panels/${panelId}/interviews`,
      data
    );
    return response.data;
  }

  async updateInterview(interviewId: string, data: Record<string, any>): Promise<any> {
    let response = await this.http.put(`/interviews/${interviewId}`, data);
    return response.data;
  }

  async deleteInterview(interviewId: string): Promise<any> {
    let response = await this.http.delete(`/interviews/${interviewId}`);
    return response.data;
  }

  async listOpportunityPanels(opportunityId: string): Promise<any> {
    let response = await this.http.get(`/opportunities/${opportunityId}/panels`);
    return response.data;
  }

  async createPanel(opportunityId: string, data: Record<string, any>): Promise<any> {
    let response = await this.http.post(`/opportunities/${opportunityId}/panels`, data);
    return response.data;
  }

  async updatePanel(panelId: string, data: Record<string, any>): Promise<any> {
    let response = await this.http.put(`/panels/${panelId}`, data);
    return response.data;
  }

  async deletePanel(panelId: string): Promise<any> {
    let response = await this.http.delete(`/panels/${panelId}`);
    return response.data;
  }

  // ─── Feedback ───

  async listOpportunityFeedback(opportunityId: string): Promise<any> {
    let response = await this.http.get(`/opportunities/${opportunityId}/feedback`);
    return response.data;
  }

  async createFeedback(opportunityId: string, data: Record<string, any>): Promise<any> {
    let response = await this.http.post(`/opportunities/${opportunityId}/feedback`, data);
    return response.data;
  }

  // ─── Notes ───

  async listOpportunityNotes(opportunityId: string): Promise<any> {
    let response = await this.http.get(`/opportunities/${opportunityId}/notes`);
    return response.data;
  }

  async createNote(opportunityId: string, data: Record<string, any>): Promise<any> {
    let response = await this.http.post(`/opportunities/${opportunityId}/notes`, data);
    return response.data;
  }

  // ─── Offers ───

  async listOpportunityOffers(opportunityId: string): Promise<any> {
    let response = await this.http.get(`/opportunities/${opportunityId}/offers`);
    return response.data;
  }

  async getOffer(offerId: string): Promise<any> {
    let response = await this.http.get(`/offers/${offerId}`);
    return response.data;
  }

  // ─── Resumes ───

  async listOpportunityResumes(opportunityId: string): Promise<any> {
    let response = await this.http.get(`/opportunities/${opportunityId}/resumes`);
    return response.data;
  }

  // ─── Files ───

  async listOpportunityFiles(opportunityId: string): Promise<any> {
    let response = await this.http.get(`/opportunities/${opportunityId}/files`);
    return response.data;
  }

  // ─── Referrals ───

  async listOpportunityReferrals(opportunityId: string): Promise<any> {
    let response = await this.http.get(`/opportunities/${opportunityId}/referrals`);
    return response.data;
  }

  // ─── Users ───

  async listUsers(params?: Record<string, any>): Promise<any> {
    let response = await this.http.get('/users', { params });
    return response.data;
  }

  async getUser(userId: string): Promise<any> {
    let response = await this.http.get(`/users/${userId}`);
    return response.data;
  }

  async createUser(data: Record<string, any>): Promise<any> {
    let response = await this.http.post('/users', data);
    return response.data;
  }

  async updateUser(userId: string, data: Record<string, any>): Promise<any> {
    let response = await this.http.put(`/users/${userId}`, data);
    return response.data;
  }

  async deactivateUser(userId: string): Promise<any> {
    let response = await this.http.put(`/users/${userId}/deactivate`);
    return response.data;
  }

  async reactivateUser(userId: string): Promise<any> {
    let response = await this.http.put(`/users/${userId}/reactivate`);
    return response.data;
  }

  // ─── Stages ───

  async listStages(): Promise<any> {
    let response = await this.http.get('/stages');
    return response.data;
  }

  // ─── Archive Reasons ───

  async listArchiveReasons(): Promise<any> {
    let response = await this.http.get('/archive_reasons');
    return response.data;
  }

  // ─── Sources ───

  async listSources(): Promise<any> {
    let response = await this.http.get('/sources');
    return response.data;
  }

  // ─── Tags ───

  async listTags(): Promise<any> {
    let response = await this.http.get('/tags');
    return response.data;
  }

  // ─── Requisitions ───

  async listRequisitions(params?: Record<string, any>): Promise<any> {
    let response = await this.http.get('/requisitions', { params });
    return response.data;
  }

  async getRequisition(requisitionId: string): Promise<any> {
    let response = await this.http.get(`/requisitions/${requisitionId}`);
    return response.data;
  }

  async createRequisition(data: Record<string, any>): Promise<any> {
    let response = await this.http.post('/requisitions', data);
    return response.data;
  }

  async updateRequisition(requisitionId: string, data: Record<string, any>): Promise<any> {
    let response = await this.http.put(`/requisitions/${requisitionId}`, data);
    return response.data;
  }

  async deleteRequisition(requisitionId: string): Promise<any> {
    let response = await this.http.delete(`/requisitions/${requisitionId}`);
    return response.data;
  }

  // ─── Webhooks ───

  async listWebhooks(): Promise<any> {
    let response = await this.http.get('/webhooks');
    return response.data;
  }

  async createWebhook(data: Record<string, any>): Promise<any> {
    let response = await this.http.post('/webhooks', data);
    return response.data;
  }

  async deleteWebhook(webhookId: string): Promise<any> {
    let response = await this.http.delete(`/webhooks/${webhookId}`);
    return response.data;
  }

  async getWebhook(webhookId: string): Promise<any> {
    let response = await this.http.get(`/webhooks/${webhookId}`);
    return response.data;
  }
}
