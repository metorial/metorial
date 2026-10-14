import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

export class EmeliaClient {
  private axios;

  constructor(private token: string) {
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.emelia.io',
      timeout: 30000,
      authHeader: { value: this.token },
      errorAdapter: error =>
        buildApiServiceError(error, { providerLabel: 'Emelia', reason: 'emelia_api_error' })
    });
    this.axios.interceptors.response.use(response => {
      let data = response.data;
      if (data && typeof data === 'object' && (data.success === false || data.error)) {
        throw createApiServiceError(
          typeof data.error === 'string'
            ? data.error
            : data.message || 'Emelia rejected the request',
          { upstreamStatus: response.status, upstreamCode: data.code }
        );
      }
      return response;
    });
  }

  private contactPayload(
    data: {
      campaignId: string;
      customFields?: Record<string, string>;
      [key: string]: unknown;
    },
    campaignType: 'email' | 'linkedin' | 'advanced'
  ) {
    let { campaignId: _campaignId, customFields, linkedInUrl, phone, ...contact } = data;
    return {
      ...customFields,
      ...contact,
      ...(linkedInUrl ? { linkedinUrlProfile: linkedInUrl } : {}),
      ...(phone ? { [campaignType === 'email' ? 'phoneNumber' : 'phone']: phone } : {})
    };
  }

  private async resolveCampaignContact(
    campaignType: 'email' | 'linkedin' | 'advanced',
    campaignId: string,
    contactId: string
  ): Promise<{ email?: string; linkedinUrlProfile?: string }> {
    let prefix = campaignType === 'email' ? 'emails' : campaignType;
    let page = 0;
    while (true) {
      let res = await this.axios.get(`/${prefix}/campaign/contacts`, {
        params: { id: campaignId, page, perPage: 100 }
      });
      let contacts: Array<{
        _id?: string;
        email?: string;
        linkedinUrlProfile?: string;
        url?: string;
      }> = res.data.list;
      if (!Array.isArray(contacts))
        throw createApiServiceError('Emelia returned an invalid contact list.');
      let contact = contacts.find(contact => contact._id === contactId);
      if (contact)
        return {
          email: contact.email,
          linkedinUrlProfile:
            contact.linkedinUrlProfile ??
            (campaignType === 'linkedin' ? contact.url : undefined)
        };
      if (
        contacts.length === 0 ||
        (typeof res.data.count === 'number' && (page + 1) * 100 >= res.data.count)
      )
        break;
      page++;
    }
    throw createApiServiceError(
      'Contact ID was not found in this campaign. Call manage_campaign_contacts with action list.'
    );
  }

  // ===== Email Campaigns =====

  async listEmailCampaigns() {
    let res = await this.axios.get('/emails/campaigns');
    return res.data.campaigns ?? res.data;
  }

  async createEmailCampaign(data: { name: string }) {
    let res = await this.axios.post('/emails/campaigns', data);
    return res.data.campaign ?? res.data;
  }

  async getEmailCampaign(campaignId: string) {
    let res = await this.axios.get(`/emails/campaigns/${encodeURIComponent(campaignId)}`);
    return res.data.campaign ?? res.data;
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
    let res = await this.axios.post(
      `/emails/campaigns/${encodeURIComponent(campaignId)}/start`
    );
    return res.data;
  }

  async pauseEmailCampaign(campaignId: string) {
    let res = await this.axios.post(
      `/emails/campaigns/${encodeURIComponent(campaignId)}/pause`
    );
    return res.data;
  }

  async getEmailCampaignStatistics(campaignId: string) {
    let res = await this.axios.get('/stats', { params: { campaignId } });
    return res.data;
  }

  async getEmailCampaignActivities(campaignId: string) {
    let res = await this.axios.get(
      `/emails/campaigns/${encodeURIComponent(campaignId)}/activities`
    );
    return res.data.activities ?? res.data;
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
    let res = await this.axios.post('/emails/campaign/contacts', {
      id: data.campaignId,
      contact: this.contactPayload(data, 'email')
    });
    return res.data;
  }

  async listEmailCampaignContacts(campaignId: string, page = 0, perPage = 100) {
    let res = await this.axios.get('/emails/campaign/contacts', {
      params: { id: campaignId, page, perPage }
    });
    return res.data;
  }

  async deleteContactFromEmailCampaign(contactId: string, campaignId: string, email?: string) {
    email ??= (await this.resolveCampaignContact('email', campaignId, contactId)).email;
    if (!email) throw createApiServiceError('The contact has no email address.');
    let res = await this.axios.delete('/emails/campaign/contacts', {
      data: { id: campaignId, email }
    });
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
    let results: unknown[] = [];
    for (let contact of data.contacts) {
      let payload = this.contactPayload({ ...contact, campaignId: data.listId }, 'email');
      results.push(
        (
          await this.axios.post('/emails/lists/contacts', {
            id: data.listId,
            contact: payload
          })
        ).data
      );
    }
    return { success: true, results };
  }

  async updateCampaignName(campaignId: string, name: string) {
    let res = await this.axios.patch(
      `/emails/campaigns/${encodeURIComponent(campaignId)}/name`,
      { name }
    );
    return res.data;
  }

  async updateCampaignGlobalSettings(campaignId: string, settings: Record<string, unknown>) {
    let current = await this.getEmailCampaign(campaignId);
    let update =
      settings.schedule && typeof settings.schedule === 'object'
        ? settings.schedule
        : settings;
    let schedule = { ...current.schedule, ...update };
    let res = await this.axios.patch(
      `/emails/campaigns/${encodeURIComponent(campaignId)}/settings/global`,
      { schedule }
    );
    return res.data;
  }

  async updateCampaignProviderSettings(
    campaignId: string,
    providers: Record<string, unknown>
  ) {
    let res = await this.axios.patch(
      `/emails/campaigns/${encodeURIComponent(campaignId)}/settings/providers`,
      providers
    );
    return res.data;
  }

  async updateCampaignSteps(campaignId: string, steps: Record<string, unknown>[]) {
    let res = await this.axios.patch(
      `/emails/campaigns/${encodeURIComponent(campaignId)}/steps`,
      { steps }
    );
    return res.data;
  }

  async sendTestEmail(campaignId: string, data: { email: string; stepIndex?: number }) {
    let res = await this.axios.post('/emails/test', {
      campaignId,
      email: data.email,
      step: data.stepIndex ?? 0
    });
    return res.data;
  }

  async setContactCustomField(
    contactId: string,
    data: { field: string; value: string },
    campaignId: string
  ) {
    let contact = await this.resolveCampaignContact('email', campaignId, contactId);
    if (!contact.email && !contact.linkedinUrlProfile)
      throw createApiServiceError('The contact needs an email or LinkedIn profile URL.');
    let res = await this.axios.patch('/emails/contacts', {
      campaignId,
      email: contact.email,
      linkedinUrlProfile: contact.linkedinUrlProfile,
      fieldName: data.field,
      fieldValue: data.value
    });
    return res.data;
  }

  async replyToEmeliaReply(data: {
    campaignId: string;
    contactId: string;
    body: string;
    providerId?: string;
    senderEmail?: string;
    messageId?: string;
    to?: string[];
    subject?: string;
  }) {
    if (data.providerId || data.senderEmail) {
      let res = await this.axios.post('/emails/reply', {
        content: data.body,
        providerId: data.providerId,
        senderEmail: data.senderEmail,
        messageId: data.messageId,
        to: data.to,
        subject: data.subject
      });
      return res.data;
    }
    let res = await this.axios.post(`/campaign/${data.campaignId}/reply`, {
      contactId: data.contactId,
      body: data.body
    });
    return res.data;
  }

  async addToBlacklist(email: string) {
    let res = await this.axios.post('/emails/blacklists/contact', { email });
    return res.data;
  }

  async removeFromBlacklist(email: string) {
    let res = await this.axios.delete('/emails/blacklists/contact', { data: { email } });
    return res.data;
  }

  // ===== LinkedIn Campaigns =====

  async listLinkedInCampaigns() {
    let res = await this.axios.get('/linkedin/campaigns');
    return res.data.campaigns ?? res.data;
  }

  async createLinkedInCampaign(data: { name: string }) {
    let res = await this.axios.post('/linkedin/campaigns', data);
    return res.data.campaign ?? res.data;
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
    let res = await this.axios.post('/linkedin/campaign/contacts', {
      id: data.campaignId,
      contact: this.contactPayload(data, 'linkedin')
    });
    return res.data;
  }

  async listLinkedInCampaignContacts(campaignId: string, page = 0, perPage = 100) {
    let res = await this.axios.get('/linkedin/campaign/contacts', {
      params: { id: campaignId, page, perPage }
    });
    return res.data;
  }

  async deleteContactFromLinkedInCampaign(
    contactId: string,
    campaignId: string,
    url?: string
  ) {
    url ??= (await this.resolveCampaignContact('linkedin', campaignId, contactId))
      .linkedinUrlProfile;
    if (!url) throw createApiServiceError('The contact has no LinkedIn profile URL.');
    let res = await this.axios.delete('/linkedin/campaign/contacts', {
      data: { id: campaignId, url }
    });
    return res.data;
  }

  async getLinkedInCampaignActivities(campaignId: string) {
    let res = await this.axios.get(
      `/linkedin/campaigns/${encodeURIComponent(campaignId)}/activities`
    );
    return res.data.activities ?? res.data;
  }

  async getLinkedInCampaignStatistics(campaignId: string) {
    let res = await this.axios.get('/stats/linkedin', { params: { campaignId } });
    return res.data;
  }

  async updateLinkedInCampaignName(campaignId: string, name: string) {
    let res = await this.axios.patch(
      `/linkedin/campaigns/${encodeURIComponent(campaignId)}/name`,
      { name }
    );
    return res.data;
  }

  async updateLinkedInCampaignGlobalSettings(
    campaignId: string,
    settings: Record<string, unknown>
  ) {
    let res = await this.axios.patch(
      `/linkedin/campaigns/${encodeURIComponent(campaignId)}/settings/global`,
      { schedule: settings.schedule ?? settings }
    );
    return res.data;
  }

  async updateLinkedInCampaignSteps(campaignId: string, steps: Record<string, unknown>[]) {
    let res = await this.axios.patch(
      `/linkedin/campaigns/${encodeURIComponent(campaignId)}/steps`,
      { steps }
    );
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
    return res.data.campaigns ?? res.data;
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
    let res = await this.axios.post('/advanced/campaign/contacts', {
      id: data.campaignId,
      contact: this.contactPayload(data, 'advanced')
    });
    return res.data;
  }

  async listAdvancedCampaignContacts(campaignId: string, page = 0, perPage = 100) {
    let res = await this.axios.get('/advanced/campaign/contacts', {
      params: { id: campaignId, page, perPage }
    });
    return res.data;
  }

  async deleteContactFromAdvancedCampaign(contactId: string, campaignId: string) {
    let res = await this.axios.delete('/advanced/campaign/contacts', {
      data: { id: campaignId, contactId }
    });
    return res.data;
  }

  async getAdvancedCampaignActivities(campaignId: string) {
    let res = await this.axios.get(
      `/advanced/campaigns/${encodeURIComponent(campaignId)}/activities`
    );
    return res.data.activities ?? res.data;
  }

  async getAdvancedCampaignStatistics(campaignId: string) {
    let res = await this.axios.get('/stats/advanced', { params: { campaignId } });
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
    data: { field: string; value: string },
    campaignId: string
  ) {
    let contact = await this.resolveCampaignContact('advanced', campaignId, contactId);
    let selector = contact.email
      ? { email: contact.email }
      : contact.linkedinUrlProfile
        ? { linkedinUrlProfile: contact.linkedinUrlProfile }
        : undefined;
    if (!selector)
      throw createApiServiceError(
        'The contact needs an email or LinkedIn profile URL to update a custom field.'
      );
    let res = await this.axios.patch('/advanced/contacts', {
      campaignId,
      ...selector,
      fieldName: data.field,
      fieldValue: data.value
    });
    return res.data;
  }

  async getAdvancedCampaignManualTasks(campaignId: string) {
    let res = await this.axios.get(
      `/advanced/campaigns/${encodeURIComponent(campaignId)}/manual-tasks`
    );
    return res.data.tasks ?? res.data;
  }

  async updateAdvancedCampaignManualTask(
    taskId: string,
    data: { status: string; campaignId: string; contactId: string }
  ) {
    if (!['ok', 'ko'].includes(data.status))
      throw createApiServiceError('Manual task status must be ok or ko.');
    let res = await this.axios.post(
      `/advanced/campaigns/${encodeURIComponent(data.campaignId)}/manual-tasks/status`,
      { taskId, contactId: data.contactId, status: data.status }
    );
    return res.data;
  }

  async getAdvancedCampaign(campaignId: string) {
    let res = await this.axios.get(`/advanced/campaigns/${encodeURIComponent(campaignId)}`);
    return res.data.campaign ?? res.data;
  }

  async changeAdvancedCampaignState(
    campaignId: string,
    action: 'start' | 'pause' | 'finish' | 'reactivate' | 'archive' | 'delete'
  ) {
    let path = `/advanced/campaigns/${encodeURIComponent(campaignId)}`;
    let res =
      action === 'delete'
        ? await this.axios.delete(path)
        : await this.axios.post(`${path}/${action}`);
    return res.data;
  }

  async updateAdvancedCampaign(
    campaignId: string,
    field: 'name' | 'steps' | 'settings' | 'recipients' | 'identities',
    data: Record<string, unknown>
  ) {
    let res = await this.axios.patch(
      `/advanced/campaigns/${encodeURIComponent(campaignId)}/${field}`,
      data
    );
    return res.data;
  }

  async manageList(
    action: 'list' | 'create' | 'get' | 'rename' | 'delete' | 'contacts',
    data: { listId?: string; name?: string; page?: number; limit?: number; search?: string }
  ) {
    let path = `/lists/list${data.listId ? `/${encodeURIComponent(data.listId)}` : ''}`;
    if (action === 'create')
      return (await this.axios.post('/lists/list', { name: data.name })).data;
    if (action === 'rename') return (await this.axios.patch(path, { name: data.name })).data;
    if (action === 'delete') return (await this.axios.delete(path)).data;
    return (
      await this.axios.get(action === 'contacts' ? `${path}/rows` : path, {
        params: {
          page: data.page,
          ...(action === 'contacts' ? { pageSize: data.limit } : { limit: data.limit }),
          search: data.search
        }
      })
    ).data;
  }

  // ===== Tools (Email/Phone Finder, Verification) =====

  async findEmail(data: {
    firstName: string;
    lastName: string;
    companyName: string;
    website?: string;
    country?: string;
  }) {
    let res = await this.axios.post('/tools/find/email', {
      fullname: `${data.firstName} ${data.lastName}`.trim(),
      companyName: data.companyName,
      companyWebsite: data.website,
      country: data.country
    });
    return res.data;
  }

  async getFindEmailResult(jobId: string) {
    let res = await this.axios.get(`/tools/find/email/${jobId}`);
    return res.data.data ?? res.data;
  }

  async findPhone(data: {
    firstName?: string;
    lastName?: string;
    companyName?: string;
    website?: string;
    country?: string;
    linkedinUrl?: string;
  }) {
    if (!data.linkedinUrl)
      throw createApiServiceError('LinkedIn profile URL is required to find a phone number.');
    let res = await this.axios.post('/tools/find/phone', { linkedinUrl: data.linkedinUrl });
    return res.data;
  }

  async getFindPhoneResult(jobId: string) {
    let res = await this.axios.get(`/tools/find/phone/${jobId}`);
    return res.data.data ?? res.data;
  }

  async verifyEmail(data: { email: string }) {
    let res = await this.axios.post('/tools/verify/email', data);
    return res.data;
  }

  async getVerifyEmailResult(jobId: string) {
    let res = await this.axios.get(`/tools/verify/email/${jobId}`);
    return res.data.data ?? res.data;
  }

  // ===== Email Providers =====

  async listEmailProviders() {
    let res = await this.axios.get('/email-providers');
    return res.data.providers ?? res.data;
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
    let res = await this.axios.post('/email-providers/warmup/enable', { providerId });
    return res.data;
  }

  async disableWarmup(providerId: string) {
    let res = await this.axios.put(`/email-providers/${providerId}/warmup/disable`);
    return res.data;
  }

  async listWarmups() {
    let res = await this.axios.get('/email-providers/warmup');
    return res.data.warmups ?? res.data;
  }

  // ===== Webhooks =====

  async listWebhooks() {
    let res = await this.axios.get('/webhook');
    return res.data.webhooks ?? res.data;
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
    return res.data.scraps ?? res.data;
  }

  async createLinkedInScraper(data: { name: string; url: string; linkedInAuthId?: string }) {
    if (!data.linkedInAuthId)
      throw createApiServiceError('LinkedIn auth config ID is required to create a scraper.');
    let res = await this.axios.post('/linkedin-scrappers', {
      name: data.name,
      url: data.url,
      authes: [data.linkedInAuthId]
    });
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

  async downloadScraperData(scraperId: string, format = 3) {
    let res = await this.axios.get(
      `/linkedin-scrappers/${encodeURIComponent(scraperId)}/download`,
      { params: { format } }
    );
    return res.data;
  }

  async splitLinkedInScraper(scraperId: string) {
    let res = await this.axios.post(
      `/linkedin-scrappers/${encodeURIComponent(scraperId)}/split`
    );
    return res.data;
  }

  async startScraperEnrichment(scraperId: string, country: string) {
    let res = await this.axios.post(
      `/linkedin-scrappers/${encodeURIComponent(scraperId)}/enrich`,
      { country }
    );
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
    let res = await this.axios.post('/linkedin-scrappers/authes', data);
    return res.data;
  }
}
