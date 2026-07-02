import { createAxios } from 'slates';

export class EmeliaClient {
  private axios;

  constructor(private token: string) {
    this.axios = createAxios({
      baseURL: 'https://api.emelia.io',
      headers: {
        Authorization: this.token,
        'Content-Type': 'application/json'
      }
    });
  }

  // ===== Email Campaigns =====

  async listEmailCampaigns() {
    let res = await this.axios.get('/campaigns');
    return res.data;
  }

  async createEmailCampaign(data: { name: string }) {
    let res = await this.axios.post('/campaigns', data);
    return res.data;
  }

  async getEmailCampaign(campaignId: string) {
    let res = await this.axios.get(`/campaigns/${campaignId}`);
    return res.data;
  }

  async deleteEmailCampaign(campaignId: string) {
    let res = await this.axios.delete(`/campaigns/${campaignId}`);
    return res.data;
  }

  async duplicateEmailCampaign(campaignId: string) {
    let res = await this.axios.post(`/campaigns/${campaignId}/duplicate`);
    return res.data;
  }

  async startEmailCampaign(campaignId: string) {
    let res = await this.axios.put(`/campaigns/${campaignId}/start`);
    return res.data;
  }

  async pauseEmailCampaign(campaignId: string) {
    let res = await this.axios.put(`/campaigns/${campaignId}/pause`);
    return res.data;
  }

  async getEmailCampaignStatistics(campaignId: string) {
    let res = await this.axios.get(`/campaign/${campaignId}/statistics`);
    return res.data;
  }

  async getEmailCampaignActivities(campaignId: string) {
    let res = await this.axios.get(`/campaign/${campaignId}/activities`);
    return res.data;
  }

  async addContactToEmailCampaign(data: {
    campaignId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    companyName?: string;
    customFields?: Record<string, string>;
    linkedInUrl?: string;
  }) {
    let res = await this.axios.post('/campaign/contacts', data);
    return res.data;
  }

  async listEmailCampaignContacts(campaignId: string) {
    let res = await this.axios.get(`/campaign/${campaignId}/contacts`);
    return res.data;
  }

  async deleteContactFromEmailCampaign(contactId: string) {
    let res = await this.axios.delete(`/campaign/contacts/${contactId}`);
    return res.data;
  }

  async addContactsToEmailList(data: {
    listId: string;
    contacts: Array<{
      email: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      companyName?: string;
      customFields?: Record<string, string>;
    }>;
  }) {
    let res = await this.axios.post('/campaign/contacts/list', data);
    return res.data;
  }

  async updateCampaignName(campaignId: string, name: string) {
    let res = await this.axios.put(`/campaign/${campaignId}/name`, { name });
    return res.data;
  }

  async updateCampaignGlobalSettings(campaignId: string, settings: Record<string, unknown>) {
    let res = await this.axios.put(`/campaign/${campaignId}/settings`, settings);
    return res.data;
  }

  async updateCampaignProviderSettings(
    campaignId: string,
    providers: Record<string, unknown>
  ) {
    let res = await this.axios.put(`/campaign/${campaignId}/providers`, providers);
    return res.data;
  }

  async updateCampaignSteps(campaignId: string, steps: Record<string, unknown>[]) {
    let res = await this.axios.put(`/campaign/${campaignId}/steps`, { steps });
    return res.data;
  }

  async sendTestEmail(campaignId: string, data: { email: string; stepIndex?: number }) {
    let res = await this.axios.post(`/campaign/${campaignId}/test`, data);
    return res.data;
  }

  async setContactCustomField(contactId: string, data: { field: string; value: string }) {
    let res = await this.axios.put(`/campaign/contact/${contactId}/custom-field`, data);
    return res.data;
  }

  async replyToEmeliaReply(data: { campaignId: string; contactId: string; body: string }) {
    let res = await this.axios.post(`/campaign/${data.campaignId}/reply`, {
      contactId: data.contactId,
      body: data.body
    });
    return res.data;
  }

  async addToBlacklist(email: string) {
    let res = await this.axios.post('/blacklist', { email });
    return res.data;
  }

  async removeFromBlacklist(email: string) {
    let res = await this.axios.delete(`/blacklist/${encodeURIComponent(email)}`);
    return res.data;
  }

  // ===== LinkedIn Campaigns =====

  async listLinkedInCampaigns() {
    let res = await this.axios.get('/linkedin/campaigns');
    return res.data;
  }

  async createLinkedInCampaign(data: { name: string }) {
    let res = await this.axios.post('/linkedin/campaigns', data);
    return res.data;
  }

  async getLinkedInCampaign(campaignId: string) {
    let res = await this.axios.get(`/linkedin/campaigns/${campaignId}`);
    return res.data;
  }

  async deleteLinkedInCampaign(campaignId: string) {
    let res = await this.axios.delete(`/linkedin/campaigns/${campaignId}`);
    return res.data;
  }

  async startLinkedInCampaign(campaignId: string) {
    let res = await this.axios.put(`/linkedin/campaigns/${campaignId}/start`);
    return res.data;
  }

  async pauseLinkedInCampaign(campaignId: string) {
    let res = await this.axios.put(`/linkedin/campaigns/${campaignId}/pause`);
    return res.data;
  }

  async addContactToLinkedInCampaign(data: {
    campaignId: string;
    linkedInUrl: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    companyName?: string;
    customFields?: Record<string, string>;
  }) {
    let res = await this.axios.post('/linkedin/campaign/contacts', data);
    return res.data;
  }

  async listLinkedInCampaignContacts(campaignId: string) {
    let res = await this.axios.get(`/linkedin/campaign/${campaignId}/contacts`);
    return res.data;
  }

  async deleteContactFromLinkedInCampaign(contactId: string) {
    let res = await this.axios.delete(`/linkedin/campaign/contacts/${contactId}`);
    return res.data;
  }

  async getLinkedInCampaignActivities(campaignId: string) {
    let res = await this.axios.get(`/linkedin/campaign/${campaignId}/activities`);
    return res.data;
  }

  async getLinkedInCampaignStatistics(campaignId: string) {
    let res = await this.axios.get(`/linkedin/campaign/${campaignId}/statistics`);
    return res.data;
  }

  async updateLinkedInCampaignName(campaignId: string, name: string) {
    let res = await this.axios.put(`/linkedin/campaign/${campaignId}/name`, { name });
    return res.data;
  }

  async updateLinkedInCampaignGlobalSettings(
    campaignId: string,
    settings: Record<string, unknown>
  ) {
    let res = await this.axios.put(`/linkedin/campaign/${campaignId}/settings`, settings);
    return res.data;
  }

  async updateLinkedInCampaignSteps(campaignId: string, steps: Record<string, unknown>[]) {
    let res = await this.axios.put(`/linkedin/campaign/${campaignId}/steps`, { steps });
    return res.data;
  }

  async addContactsToLinkedInList(data: {
    listId: string;
    contacts: Array<{
      linkedInUrl: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      companyName?: string;
      customFields?: Record<string, string>;
    }>;
  }) {
    let res = await this.axios.post('/linkedin/campaign/contacts/list', data);
    return res.data;
  }

  async setLinkedInContactCustomField(
    contactId: string,
    data: { field: string; value: string }
  ) {
    let res = await this.axios.put(
      `/linkedin/campaign/contact/${contactId}/custom-field`,
      data
    );
    return res.data;
  }

  // ===== Advanced Campaigns =====

  async listAdvancedCampaigns() {
    let res = await this.axios.get('/advanced/campaigns');
    return res.data;
  }

  async createAdvancedCampaign(data: { name: string }) {
    let res = await this.axios.post('/advanced/campaigns', data);
    return res.data;
  }

  async addContactToAdvancedCampaign(data: {
    campaignId: string;
    email?: string;
    linkedInUrl?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    companyName?: string;
    customFields?: Record<string, string>;
  }) {
    let res = await this.axios.post('/advanced/campaign/contacts', data);
    return res.data;
  }

  async listAdvancedCampaignContacts(campaignId: string) {
    let res = await this.axios.get(`/advanced/campaign/${campaignId}/contacts`);
    return res.data;
  }

  async deleteContactFromAdvancedCampaign(contactId: string) {
    let res = await this.axios.delete(`/advanced/campaign/contacts/${contactId}`);
    return res.data;
  }

  async getAdvancedCampaignActivities(campaignId: string) {
    let res = await this.axios.get(`/advanced/campaign/${campaignId}/activities`);
    return res.data;
  }

  async getAdvancedCampaignStatistics(campaignId: string) {
    let res = await this.axios.get(`/advanced/campaign/${campaignId}/statistics`);
    return res.data;
  }

  async addContactsToAdvancedList(data: {
    listId: string;
    contacts: Record<string, unknown>[];
  }) {
    let res = await this.axios.post('/advanced/campaign/contacts/list', data);
    return res.data;
  }

  async setAdvancedContactCustomField(
    contactId: string,
    data: { field: string; value: string }
  ) {
    let res = await this.axios.put(
      `/advanced/campaign/contact/${contactId}/custom-field`,
      data
    );
    return res.data;
  }

  async getAdvancedCampaignManualTasks(campaignId: string) {
    let res = await this.axios.get(`/advanced/campaign/${campaignId}/manual-tasks`);
    return res.data;
  }

  async updateAdvancedCampaignManualTask(taskId: string, data: { status: string }) {
    let res = await this.axios.put(`/advanced/campaign/manual-task/${taskId}`, data);
    return res.data;
  }

  // ===== Tools (Email/Phone Finder, Verification) =====

  async findEmail(data: {
    firstName: string;
    lastName: string;
    companyName: string;
    website?: string;
    country?: string;
  }) {
    let res = await this.axios.post('/tools/find/email', data);
    return res.data;
  }

  async getFindEmailResult(jobId: string) {
    let res = await this.axios.get(`/tools/find/email/${jobId}`);
    return res.data;
  }

  async findPhone(data: {
    firstName: string;
    lastName: string;
    companyName: string;
    website?: string;
    country?: string;
  }) {
    let res = await this.axios.post('/tools/find/phone', data);
    return res.data;
  }

  async getFindPhoneResult(jobId: string) {
    let res = await this.axios.get(`/tools/find/phone/${jobId}`);
    return res.data;
  }

  async verifyEmail(data: { email: string }) {
    let res = await this.axios.post('/tools/verify/email', data);
    return res.data;
  }

  async getVerifyEmailResult(jobId: string) {
    let res = await this.axios.get(`/tools/verify/email/${jobId}`);
    return res.data;
  }

  // ===== Email Providers =====

  async listEmailProviders() {
    let res = await this.axios.get('/email-providers');
    return res.data;
  }

  async addEmailProvider(data: Record<string, unknown>) {
    let res = await this.axios.post('/email-providers', data);
    return res.data;
  }

  async deleteEmailProvider(providerId: string) {
    let res = await this.axios.delete(`/email-providers/${providerId}`);
    return res.data;
  }

  async enableWarmup(providerId: string) {
    let res = await this.axios.put(`/email-providers/${providerId}/warmup/enable`);
    return res.data;
  }

  async disableWarmup(providerId: string) {
    let res = await this.axios.put(`/email-providers/${providerId}/warmup/disable`);
    return res.data;
  }

  async listWarmups() {
    let res = await this.axios.get('/email-providers/warmups');
    return res.data;
  }

  // ===== Webhooks =====

  async listWebhooks() {
    let res = await this.axios.get('/webhooks');
    return res.data;
  }

  async createWebhook(data: { campaignId: string; url: string; event: string }) {
    let res = await this.axios.post('/webhooks', data);
    return res.data;
  }

  async deleteWebhook(webhookId: string) {
    let res = await this.axios.delete(`/webhooks/${webhookId}`);
    return res.data;
  }

  async testWebhook(webhookId: string) {
    let res = await this.axios.post(`/webhooks/${webhookId}/test`);
    return res.data;
  }

  // ===== LinkedIn Scrapers =====

  async listLinkedInScrapers() {
    let res = await this.axios.get('/linkedin-scrappers');
    return res.data;
  }

  async createLinkedInScraper(data: { name: string; url: string; linkedInAuthId?: string }) {
    let res = await this.axios.post('/linkedin-scrappers', data);
    return res.data;
  }

  async deleteLinkedInScraper(scraperId: string) {
    let res = await this.axios.delete(`/linkedin-scrappers/${scraperId}`);
    return res.data;
  }

  async renameLinkedInScraper(scraperId: string, name: string) {
    let res = await this.axios.put(`/linkedin-scrappers/${scraperId}/rename`, { name });
    return res.data;
  }

  async pauseLinkedInScraper(scraperId: string) {
    let res = await this.axios.put(`/linkedin-scrappers/${scraperId}/pause`);
    return res.data;
  }

  async resumeLinkedInScraper(scraperId: string) {
    let res = await this.axios.put(`/linkedin-scrappers/${scraperId}/resume`);
    return res.data;
  }

  async downloadScraperData(scraperId: string) {
    let res = await this.axios.get(`/linkedin-scrappers/${scraperId}/download`);
    return res.data;
  }

  async splitLinkedInScraper(scraperId: string, data: { parts: number }) {
    let res = await this.axios.post(`/linkedin-scrappers/${scraperId}/split`, data);
    return res.data;
  }

  async startScraperEnrichment(scraperId: string) {
    let res = await this.axios.post(`/linkedin-scrappers/${scraperId}/enrichment`);
    return res.data;
  }

  async addWebhookToScraper(scraperId: string, data: { url: string; events: string[] }) {
    let res = await this.axios.post(`/linkedin-scrappers/${scraperId}/webhook`, data);
    return res.data;
  }

  async removeWebhookFromScraper(scraperId: string) {
    let res = await this.axios.delete(`/linkedin-scrappers/${scraperId}/webhook`);
    return res.data;
  }

  // ===== LinkedIn Auth =====

  async listLinkedInAuthConfigs() {
    let res = await this.axios.get('/linkedin-auth');
    return res.data;
  }

  async createLinkedInAuthConfig(data: Record<string, unknown>) {
    let res = await this.axios.post('/linkedin-auth', data);
    return res.data;
  }
}
