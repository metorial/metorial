import { createAxios } from 'slates';

let BASE_URL = 'https://webapi.mymarketing.co.il/api';

export class ActiveTrailClient {
  private axios;

  constructor(private token: string) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        Authorization: this.token,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── Contacts ───

  async listContacts(
    params: {
      customerStates?: string;
      searchTerm?: string;
      fromDate?: string;
      toDate?: string;
      page?: number;
      limit?: number;
    } = {}
  ) {
    let response = await this.axios.get('/contacts', {
      params: {
        CustomerStates: params.customerStates,
        SearchTerm: params.searchTerm,
        FromDate: params.fromDate,
        ToDate: params.toDate,
        Page: params.page,
        Limit: params.limit
      }
    });
    return response.data;
  }

  async getContact(contactId: number) {
    let response = await this.axios.get(`/contacts/${contactId}`);
    return response.data;
  }

  async createContact(data: Record<string, any>) {
    let response = await this.axios.post('/contacts', data);
    return response.data;
  }

  async updateContact(contactId: number, data: Record<string, any>) {
    let response = await this.axios.put(`/contacts/${contactId}`, data);
    return response.data;
  }

  async deleteContact(contactId: number) {
    let response = await this.axios.delete(`/contacts/${contactId}`);
    return response.data;
  }

  async importContacts(groupId: number, contacts: Record<string, any>[]) {
    let response = await this.axios.post('/contacts/Import', {
      group_id: groupId,
      contacts
    });
    return response.data;
  }

  async getContactGroups(contactId: number) {
    let response = await this.axios.get(`/contacts/${contactId}/groups`);
    return response.data;
  }

  async getContactActivity(contactId: number) {
    let response = await this.axios.get(`/contacts/${contactId}/activity`);
    return response.data;
  }

  async getContactBounces(contactId: number) {
    let response = await this.axios.get(`/contacts/${contactId}/errors`);
    return response.data;
  }

  async getContactMailingLists(contactId: number) {
    let response = await this.axios.get(`/contacts/${contactId}/mailinglists`);
    return response.data;
  }

  async getSubscribers(
    params: { fromDate?: string; toDate?: string; page?: number; limit?: number } = {}
  ) {
    let response = await this.axios.get('/contacts/Subscription/Subscribers', {
      params: {
        FromDate: params.fromDate,
        ToDate: params.toDate,
        Page: params.page,
        Limit: params.limit
      }
    });
    return response.data;
  }

  async getUnsubscribers(
    params: { fromDate?: string; toDate?: string; page?: number; limit?: number } = {}
  ) {
    let response = await this.axios.get('/contacts/Subscription/Unsubscribers', {
      params: {
        FromDate: params.fromDate,
        ToDate: params.toDate,
        Page: params.page,
        Limit: params.limit
      }
    });
    return response.data;
  }

  // ─── Groups ───

  async listGroups(params: { page?: number; limit?: number } = {}) {
    let response = await this.axios.get('/groups', {
      params: { Page: params.page, Limit: params.limit }
    });
    return response.data;
  }

  async getGroup(groupId: number) {
    let response = await this.axios.get(`/groups/${groupId}`);
    return response.data;
  }

  async createGroup(data: { name: string }) {
    let response = await this.axios.post('/groups', data);
    return response.data;
  }

  async updateGroup(groupId: number, data: { name: string }) {
    let response = await this.axios.put(`/groups/${groupId}`, data);
    return response.data;
  }

  async deleteGroup(groupId: number) {
    let response = await this.axios.delete(`/groups/${groupId}`);
    return response.data;
  }

  async getGroupMembers(
    groupId: number,
    params: {
      customerStates?: string;
      fromDate?: string;
      toDate?: string;
      page?: number;
      limit?: number;
    } = {}
  ) {
    let response = await this.axios.get(`/groups/${groupId}/members`, {
      params: {
        CustomerStates: params.customerStates,
        FromDate: params.fromDate,
        ToDate: params.toDate,
        Page: params.page,
        Limit: params.limit
      }
    });
    return response.data;
  }

  async addContactToGroup(groupId: number, contact: Record<string, any>) {
    let response = await this.axios.post(`/groups/${groupId}/members`, contact);
    return response.data;
  }

  async removeContactFromGroup(groupId: number, memberId: number) {
    let response = await this.axios.delete(`/groups/${groupId}/members/${memberId}`);
    return response.data;
  }

  async getGroupEvents(groupId: number) {
    let response = await this.axios.get(`/groups/${groupId}/events`);
    return response.data;
  }

  // ─── Mailing Lists ───

  async listMailingLists(params: { page?: number; limit?: number } = {}) {
    let response = await this.axios.get('/mailinglist', {
      params: { Page: params.page, Limit: params.limit }
    });
    return response.data;
  }

  async getMailingList(mailingListId: number) {
    let response = await this.axios.get(`/mailinglist/${mailingListId}`);
    return response.data;
  }

  async createMailingList(data: { name: string }) {
    let response = await this.axios.post('/mailinglist', data);
    return response.data;
  }

  async deleteMailingList(mailingListId: number) {
    let response = await this.axios.delete(`/mailinglist/${mailingListId}`);
    return response.data;
  }

  async getMailingListMembers(
    mailingListId: number,
    params: {
      customerStates?: string;
      fromDate?: string;
      toDate?: string;
      page?: number;
      limit?: number;
    } = {}
  ) {
    let response = await this.axios.get(`/mailinglist/${mailingListId}/members`, {
      params: {
        CustomerStates: params.customerStates,
        FromDate: params.fromDate,
        ToDate: params.toDate,
        Page: params.page,
        Limit: params.limit
      }
    });
    return response.data;
  }

  async addContactToMailingList(mailingListId: number, contact: Record<string, any>) {
    let response = await this.axios.post(`/mailinglist/${mailingListId}/members`, contact);
    return response.data;
  }

  async removeContactFromMailingList(mailingListId: number, memberId: number) {
    let response = await this.axios.delete(
      `/mailinglist/${mailingListId}/members/${memberId}`
    );
    return response.data;
  }

  // ─── Email Campaigns ───

  async listCampaigns(
    params: {
      mailingListId?: number;
      contentCategoryId?: number;
      searchTerm?: string;
      sendType?: string;
      fromDate?: string;
      toDate?: string;
      page?: number;
      limit?: number;
    } = {}
  ) {
    let response = await this.axios.get('/campaigns', {
      params: {
        MailingListId: params.mailingListId,
        ContentCategoryId: params.contentCategoryId,
        SearchTerm: params.searchTerm,
        SendType: params.sendType,
        FromDate: params.fromDate,
        ToDate: params.toDate,
        Page: params.page,
        Limit: params.limit
      }
    });
    return response.data;
  }

  async getCampaign(campaignId: number) {
    let response = await this.axios.get(`/campaigns/${campaignId}`);
    return response.data;
  }

  async createCampaign(data: Record<string, any>) {
    let response = await this.axios.post('/campaigns', data);
    return response.data;
  }

  async updateCampaign(campaignId: number, data: Record<string, any>) {
    let response = await this.axios.put(`/campaigns/${campaignId}`, data);
    return response.data;
  }

  async deleteCampaign(campaignId: number) {
    let response = await this.axios.delete(`/campaigns/${campaignId}`);
    return response.data;
  }

  async getCampaignDetails(campaignId: number) {
    let response = await this.axios.get(`/campaigns/${campaignId}/details`);
    return response.data;
  }

  async updateCampaignDetails(campaignId: number, data: Record<string, any>) {
    let response = await this.axios.put(`/campaigns/${campaignId}/details`, data);
    return response.data;
  }

  async getCampaignDesign(campaignId: number) {
    let response = await this.axios.get(`/campaigns/${campaignId}/design`);
    return response.data;
  }

  async updateCampaignDesign(campaignId: number, data: Record<string, any>) {
    let response = await this.axios.put(`/campaigns/${campaignId}/design`, data);
    return response.data;
  }

  async getCampaignSegment(campaignId: number) {
    let response = await this.axios.get(`/campaigns/${campaignId}/segment`);
    return response.data;
  }

  async updateCampaignSegment(campaignId: number, data: Record<string, any>) {
    let response = await this.axios.put(`/campaigns/${campaignId}/segment`, data);
    return response.data;
  }

  async getCampaignScheduling(campaignId: number) {
    let response = await this.axios.get(`/campaigns/${campaignId}/scheduling`);
    return response.data;
  }

  async updateCampaignScheduling(campaignId: number, data: Record<string, any>) {
    let response = await this.axios.put(`/campaigns/${campaignId}/scheduling`, data);
    return response.data;
  }

  async createCampaignForContacts(data: Record<string, any>) {
    let response = await this.axios.post('/campaigns/Contacts', data);
    return response.data;
  }

  // ─── SMS Campaigns ───

  async listSmsCampaigns(params: { page?: number; limit?: number } = {}) {
    let response = await this.axios.get('/smscampaign/Campaign', {
      params: { Page: params.page, Limit: params.limit }
    });
    return response.data;
  }

  async getSmsCampaign(campaignId: number) {
    let response = await this.axios.get(`/smscampaign/Campaign/${campaignId}`);
    return response.data;
  }

  async createSmsCampaign(data: Record<string, any>) {
    let response = await this.axios.post('/smscampaign/Campaign', data);
    return response.data;
  }

  async updateSmsCampaign(campaignId: number, data: Record<string, any>) {
    let response = await this.axios.put(`/smscampaign/Campaign/${campaignId}`, data);
    return response.data;
  }

  async estimateSmsCampaign(campaignId: number) {
    let response = await this.axios.get(`/smscampaign/Campaign/${campaignId}/estimate`);
    return response.data;
  }

  // ─── SMS Operational Messages ───

  async sendSmsOperationalMessage(data: Record<string, any>) {
    let response = await this.axios.post('/smscampaign/OperationalMessage', data);
    return response.data;
  }

  // ─── WhatsApp ───

  async sendWhatsAppCampaign(data: Record<string, any>) {
    let response = await this.axios.post('/whatsappcampaign/SendCampaign', data);
    return response.data;
  }

  async sendWhatsAppOperationalMessage(data: Record<string, any>) {
    let response = await this.axios.post('/whatsappcampaign/SendOperationalMessage', data);
    return response.data;
  }

  async listWhatsAppTemplates() {
    let response = await this.axios.get('/whatsappcampaign/templates');
    return response.data;
  }

  async getWhatsAppTemplate(templateId: number) {
    let response = await this.axios.get(`/whatsappcampaign/templates/${templateId}`);
    return response.data;
  }

  // ─── Operational Messages (Email) ───

  async sendOperationalMessage(data: Record<string, any>) {
    let response = await this.axios.post('/OperationalMessage/Message', data);
    return response.data;
  }

  async getOperationalMessageClassifications() {
    let response = await this.axios.get('/OperationalMessage/Classification');
    return response.data;
  }

  // ─── Campaign Reports ───

  async getCampaignReport(campaignId: number) {
    let response = await this.axios.get(`/campaignreports/${campaignId}`);
    return response.data;
  }

  async listCampaignReports(
    params: { fromDate?: string; toDate?: string; page?: number; limit?: number } = {}
  ) {
    let response = await this.axios.get('/campaignreports', {
      params: {
        FromDate: params.fromDate,
        ToDate: params.toDate,
        Page: params.page,
        Limit: params.limit
      }
    });
    return response.data;
  }

  async getCampaignReportOpens(
    campaignId: number,
    params: { page?: number; limit?: number } = {}
  ) {
    let response = await this.axios.get(`/campaignreports/${campaignId}/opens`, {
      params: { Page: params.page, Limit: params.limit }
    });
    return response.data;
  }

  async getCampaignReportClicks(
    campaignId: number,
    params: { page?: number; limit?: number } = {}
  ) {
    let response = await this.axios.get(`/campaignreports/${campaignId}/clickdetails`, {
      params: { Page: params.page, Limit: params.limit }
    });
    return response.data;
  }

  async getCampaignReportBounces(
    campaignId: number,
    params: { page?: number; limit?: number } = {}
  ) {
    let response = await this.axios.get(`/campaignreports/${campaignId}/bounces`, {
      params: { Page: params.page, Limit: params.limit }
    });
    return response.data;
  }

  async getCampaignReportUnsubscribed(
    campaignId: number,
    params: { page?: number; limit?: number } = {}
  ) {
    let response = await this.axios.get(`/campaignreports/${campaignId}/unsubscribed`, {
      params: { Page: params.page, Limit: params.limit }
    });
    return response.data;
  }

  async getCampaignReportComplaints(
    campaignId: number,
    params: { page?: number; limit?: number } = {}
  ) {
    let response = await this.axios.get(`/campaignreports/${campaignId}/complaints`, {
      params: { Page: params.page, Limit: params.limit }
    });
    return response.data;
  }

  async getCampaignReportDomains(campaignId: number) {
    let response = await this.axios.get(`/campaignreports/${campaignId}/domains`);
    return response.data;
  }

  // ─── SMS Campaign Reports ───

  async getSmsCampaignReport(campaignId: number) {
    let response = await this.axios.get(`/smscampaignreport/${campaignId}`);
    return response.data;
  }

  async listSmsCampaignReports(
    params: { fromDate?: string; toDate?: string; page?: number; limit?: number } = {}
  ) {
    let response = await this.axios.get('/smscampaignreport', {
      params: {
        FromDate: params.fromDate,
        ToDate: params.toDate,
        Page: params.page,
        Limit: params.limit
      }
    });
    return response.data;
  }

  // ─── Automations ───

  async listAutomations(params: { page?: number; limit?: number } = {}) {
    let response = await this.axios.get('/automations', {
      params: { Page: params.page, Limit: params.limit }
    });
    return response.data;
  }

  async getAutomation(automationId: number) {
    let response = await this.axios.get(`/automations/${automationId}`);
    return response.data;
  }

  async getAutomationDetails(automationId: number) {
    let response = await this.axios.get(`/automations/${automationId}/details`);
    return response.data;
  }

  async updateAutomationDetails(automationId: number, data: Record<string, any>) {
    let response = await this.axios.put(`/automations/${automationId}/details`, data);
    return response.data;
  }

  async getAutomationDesign(automationId: number) {
    let response = await this.axios.get(`/automations/${automationId}/design`);
    return response.data;
  }

  async getAutomationActivation(automationId: number) {
    let response = await this.axios.get(`/automations/${automationId}/activation`);
    return response.data;
  }

  async setAutomationActivation(automationId: number, data: { is_active: boolean }) {
    let response = await this.axios.put(`/automations/${automationId}/activation`, data);
    return response.data;
  }

  async deleteAutomations(ids: string) {
    let response = await this.axios.delete(`/automations/${ids}`);
    return response.data;
  }

  async sendAutomationTest(automationId: number, data: Record<string, any>) {
    let response = await this.axios.post(`/automations/${automationId}/test`, data);
    return response.data;
  }

  // ─── Automation Reports ───

  async getAutomationReport(automationId: number) {
    let response = await this.axios.get(`/automationreports/${automationId}/OverviewReport`);
    return response.data;
  }

  async getAutomationEmailStats(automationId: number) {
    let response = await this.axios.get(
      `/automationreports/${automationId}/automationemailscampaignstatistic`
    );
    return response.data;
  }

  async getAutomationSmsStats(automationId: number) {
    let response = await this.axios.get(
      `/automationreports/${automationId}/automationsmscampaignstatistic`
    );
    return response.data;
  }

  async getAutomationContactsStarted(
    automationId: number,
    params: { page?: number; limit?: number } = {}
  ) {
    let response = await this.axios.get(`/automationreports/${automationId}/ContactsStarted`, {
      params: { Page: params.page, Limit: params.limit }
    });
    return response.data;
  }

  async getAutomationContactsEnded(
    automationId: number,
    params: { page?: number; limit?: number } = {}
  ) {
    let response = await this.axios.get(`/automationreports/${automationId}/ContactsEnded`, {
      params: { Page: params.page, Limit: params.limit }
    });
    return response.data;
  }

  // ─── Webhooks ───

  async listWebhooks() {
    let response = await this.axios.get('/webhooks');
    return response.data;
  }

  async getWebhook(webhookId: number) {
    let response = await this.axios.get(`/webhooks/${webhookId}`);
    return response.data;
  }

  async createWebhook(data: Record<string, any>) {
    let response = await this.axios.post('/webhooks', data);
    return response.data;
  }

  async updateWebhook(webhookId: number, data: Record<string, any>) {
    let response = await this.axios.put(`/webhooks/${webhookId}`, data);
    return response.data;
  }

  async deleteWebhook(webhookId: number) {
    let response = await this.axios.delete(`/webhooks/${webhookId}`);
    return response.data;
  }

  async testWebhook(webhookId: number) {
    let response = await this.axios.post(`/webhooks/${webhookId}/Test`);
    return response.data;
  }

  // ─── Account ───

  async getAccountBalance() {
    let response = await this.axios.get('/account/balance');
    return response.data;
  }

  async getContactFields(params: { type?: string } = {}) {
    let response = await this.axios.get('/account/contactFields', {
      params: { Type: params.type }
    });
    return response.data;
  }

  async getSendingProfiles() {
    let response = await this.axios.get('/account/sendingprofiles');
    return response.data;
  }

  async getSmsSendingProfiles() {
    let response = await this.axios.get('/account/sms-sendingprofiles');
    return response.data;
  }

  async getContentCategories() {
    let response = await this.axios.get('/account/contentCategories');
    return response.data;
  }

  async getExecutiveReport() {
    let response = await this.axios.get('/account/executivereport');
    return response.data;
  }

  async getContactGrowthReport() {
    let response = await this.axios.get('/account/executivereport/contactgrowth');
    return response.data;
  }

  // ─── Templates ───

  async listTemplates(params: { page?: number; limit?: number } = {}) {
    let response = await this.axios.get('/templates', {
      params: { Page: params.page, Limit: params.limit }
    });
    return response.data;
  }

  async getTemplate(templateId: number) {
    let response = await this.axios.get(`/templates/${templateId}`);
    return response.data;
  }

  async createTemplate(data: Record<string, any>) {
    let response = await this.axios.post('/templates', data);
    return response.data;
  }

  async updateTemplate(templateId: number, data: Record<string, any>) {
    let response = await this.axios.put(`/templates/${templateId}`, data);
    return response.data;
  }

  async deleteTemplate(templateId: number) {
    let response = await this.axios.delete(`/templates/${templateId}`);
    return response.data;
  }

  async getTemplateContent(templateId: number) {
    let response = await this.axios.get(`/templates/${templateId}/content`);
    return response.data;
  }

  async updateTemplateContent(templateId: number, data: Record<string, any>) {
    let response = await this.axios.put(`/templates/${templateId}/content`, data);
    return response.data;
  }

  async createCampaignFromTemplate(templateId: number, data: Record<string, any>) {
    let response = await this.axios.post(`/templates/${templateId}/campaign`, data);
    return response.data;
  }

  // ─── Commerce ───

  async createOrder(data: Record<string, any>) {
    let response = await this.axios.post('/commerce/Order', data);
    return response.data;
  }

  async updateOrder(orderId: string, data: Record<string, any>) {
    let response = await this.axios.put(`/commerce/Order/${orderId}`, data);
    return response.data;
  }

  async getOrder(orderId: string) {
    let response = await this.axios.get(`/commerce/Order/${orderId}`);
    return response.data;
  }

  async createCart(data: Record<string, any>) {
    let response = await this.axios.post('/commerce/Cart', data);
    return response.data;
  }

  // ─── Sales Lifecycle ───

  async createLead(data: Record<string, any>) {
    let response = await this.axios.post('/salesLifeCycle/Lead', data);
    return response.data;
  }

  async updateLead(leadId: string, data: Record<string, any>) {
    let response = await this.axios.put(`/salesLifeCycle/Lead/${leadId}`, data);
    return response.data;
  }

  async getLead(leadId: string) {
    let response = await this.axios.get(`/salesLifeCycle/Lead/${leadId}`);
    return response.data;
  }

  async createOpportunity(data: Record<string, any>) {
    let response = await this.axios.post('/salesLifeCycle/Opportunity', data);
    return response.data;
  }

  async updateOpportunity(opportunityId: string, data: Record<string, any>) {
    let response = await this.axios.put(`/salesLifeCycle/Opportunity/${opportunityId}`, data);
    return response.data;
  }

  async getOpportunity(opportunityId: string) {
    let response = await this.axios.get(`/salesLifeCycle/Opportunity/${opportunityId}`);
    return response.data;
  }

  // ─── Signup Forms & Landing Pages ───

  async listSignupForms() {
    let response = await this.axios.get('/signupforms');
    return response.data;
  }

  async getSignupForm(formId: number) {
    let response = await this.axios.get(`/signupforms/${formId}`);
    return response.data;
  }

  async listLandingPages() {
    let response = await this.axios.get('/landingpage');
    return response.data;
  }
}
