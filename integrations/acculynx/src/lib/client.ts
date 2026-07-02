import { createAxios } from 'slates';

let BASE_URL = 'https://api.acculynx.com/api/v2';
let WEBHOOKS_BASE_URL = 'https://api.acculynx.com/webhooks/v2';

export class Client {
  private api;
  private webhooksApi;

  constructor(config: { token: string }) {
    this.api = createAxios({
      baseURL: BASE_URL,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
    this.webhooksApi = createAxios({
      baseURL: WEBHOOKS_BASE_URL,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // --- Jobs ---

  async getJobs(params?: {
    pageSize?: number;
    pageStartIndex?: number;
    startDate?: string;
    endDate?: string;
    dateFilterType?: string;
    milestones?: string;
    sortBy?: string;
    sortOrder?: string;
    includes?: string;
    assignment?: string;
    filterByDate?: string;
  }) {
    let response = await this.api.get('/jobs', { params });
    return response.data;
  }

  async getJob(jobId: string) {
    let response = await this.api.get(`/jobs/${jobId}`);
    return response.data;
  }

  async createJob(data: {
    contactId: string;
    tradeType?: string;
    workType?: string;
    leadSource?: string;
    leadSourceChild?: string;
    estimatedJobValue?: number;
    description?: string;
  }) {
    let response = await this.api.post('/jobs', data);
    return response.data;
  }

  async searchJobs(data: { query?: string; pageSize?: number; pageStartIndex?: number }) {
    let response = await this.api.post('/jobs/search', data);
    return response.data;
  }

  async getJobHistory(jobId: string) {
    let response = await this.api.get(`/jobs/${jobId}/history`);
    return response.data;
  }

  async getJobContacts(jobId: string) {
    let response = await this.api.get(`/jobs/${jobId}/contacts`);
    return response.data;
  }

  async getJobContact(jobId: string, contactId: string) {
    let response = await this.api.get(`/jobs/${jobId}/contacts/${contactId}`);
    return response.data;
  }

  async getJobMilestones(jobId: string) {
    let response = await this.api.get(`/jobs/${jobId}/milestones`);
    return response.data;
  }

  async getJobCurrentMilestone(jobId: string) {
    let response = await this.api.get(`/jobs/${jobId}/milestones/current`);
    return response.data;
  }

  async getJobRepresentatives(jobId: string) {
    let response = await this.api.get(`/jobs/${jobId}/representatives`);
    return response.data;
  }

  async setCompanyRepresentative(jobId: string, data: { userId: string }) {
    let response = await this.api.post(`/jobs/${jobId}/representatives/company`, data);
    return response.data;
  }

  async setSalesOwner(jobId: string, data: { userId: string }) {
    let response = await this.api.post(`/jobs/${jobId}/representatives/sales-owner`, data);
    return response.data;
  }

  async deleteSalesOwner(jobId: string) {
    let response = await this.api.delete(`/jobs/${jobId}/representatives/sales-owner`);
    return response.data;
  }

  async setArOwner(jobId: string, data: { userId: string }) {
    let response = await this.api.post(`/jobs/${jobId}/representatives/ar-owner`, data);
    return response.data;
  }

  async deleteArOwner(jobId: string) {
    let response = await this.api.delete(`/jobs/${jobId}/representatives/ar-owner`);
    return response.data;
  }

  async getJobInsurance(jobId: string) {
    let response = await this.api.get(`/jobs/${jobId}/insurance`);
    return response.data;
  }

  async setJobInsurance(
    jobId: string,
    data: {
      insuranceCompanyId: string;
      claimNumber?: string;
      policyNumber?: string;
      dateOfLoss?: string;
    }
  ) {
    let response = await this.api.put(`/jobs/${jobId}/insurance`, data);
    return response.data;
  }

  async getJobAdjuster(jobId: string) {
    let response = await this.api.get(`/jobs/${jobId}/adjuster`);
    return response.data;
  }

  // --- External References ---

  async getExternalReferences() {
    let response = await this.api.get('/jobs/external-references');
    return response.data;
  }

  async createExternalReference(data: { jobId: string; externalId: string; source?: string }) {
    let response = await this.api.post('/jobs/external-references', data);
    return response.data;
  }

  // --- Contacts ---

  async getContacts(params?: { pageSize?: number; pageStartIndex?: number }) {
    let response = await this.api.get('/contacts', { params });
    return response.data;
  }

  async getContact(contactId: string) {
    let response = await this.api.get(`/contacts/${contactId}`);
    return response.data;
  }

  async createContact(data: {
    firstName?: string;
    lastName?: string;
    companyName?: string;
    contactType?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      zip?: string;
      country?: string;
    };
    emailAddresses?: { emailAddress: string; isPrimary?: boolean }[];
    phoneNumbers?: { phoneNumber: string; type?: string; isPrimary?: boolean }[];
  }) {
    let response = await this.api.post('/contacts', data);
    return response.data;
  }

  async searchContacts(data: { query?: string; pageSize?: number; pageStartIndex?: number }) {
    let response = await this.api.post('/contacts/search', data);
    return response.data;
  }

  async getContactTypes() {
    let response = await this.api.get('/contacts/types');
    return response.data;
  }

  async getContactEmailAddresses(contactId: string) {
    let response = await this.api.get(`/contacts/${contactId}/email-addresses`);
    return response.data;
  }

  async getContactPhoneNumbers(contactId: string) {
    let response = await this.api.get(`/contacts/${contactId}/phone-numbers`);
    return response.data;
  }

  async createContactLog(
    contactId: string,
    data: {
      type?: string;
      date?: string;
      description?: string;
    }
  ) {
    let response = await this.api.post(`/contacts/${contactId}/logs`, data);
    return response.data;
  }

  // --- Estimates ---

  async getEstimates(params?: { pageSize?: number; pageStartIndex?: number }) {
    let response = await this.api.get('/estimates', { params });
    return response.data;
  }

  async getEstimate(estimateId: string) {
    let response = await this.api.get(`/estimates/${estimateId}`);
    return response.data;
  }

  async getJobEstimates(jobId: string) {
    let response = await this.api.get(`/jobs/${jobId}/estimates`);
    return response.data;
  }

  async getEstimateSections(params?: { pageSize?: number; pageStartIndex?: number }) {
    let response = await this.api.get('/estimates/sections', { params });
    return response.data;
  }

  async getEstimateSection(sectionId: string) {
    let response = await this.api.get(`/estimates/sections/${sectionId}`);
    return response.data;
  }

  async getEstimateSectionItems(sectionId: string) {
    let response = await this.api.get(`/estimates/sections/${sectionId}/items`);
    return response.data;
  }

  // --- Invoices ---

  async getJobInvoices(jobId: string) {
    let response = await this.api.get(`/jobs/${jobId}/invoices`);
    return response.data;
  }

  async getInvoice(invoiceId: string) {
    let response = await this.api.get(`/invoices/${invoiceId}`);
    return response.data;
  }

  // --- Financials ---

  async getJobFinancials(jobId: string) {
    let response = await this.api.get(`/jobs/${jobId}/financials`);
    return response.data;
  }

  async getFinancial(financialId: string) {
    let response = await this.api.get(`/financials/${financialId}`);
    return response.data;
  }

  async getWorksheet(financialId: string, worksheetId: string) {
    let response = await this.api.get(`/financials/${financialId}/worksheets/${worksheetId}`);
    return response.data;
  }

  async createWorksheetItem(
    financialId: string,
    worksheetId: string,
    data: Record<string, any>
  ) {
    let response = await this.api.post(
      `/financials/${financialId}/worksheets/${worksheetId}/items`,
      data
    );
    return response.data;
  }

  async getFinancialAmendments(financialId: string) {
    let response = await this.api.get(`/financials/${financialId}/amendments`);
    return response.data;
  }

  async getFinancialAmendment(financialId: string, amendmentId: string) {
    let response = await this.api.get(`/financials/${financialId}/amendments/${amendmentId}`);
    return response.data;
  }

  async getAccountingIntegrationStatus(jobId: string) {
    let response = await this.api.get(`/jobs/${jobId}/accounting-integrations/sync-changes`);
    return response.data;
  }

  // --- Supplements ---

  async getSupplements(params?: { pageSize?: number; pageStartIndex?: number }) {
    let response = await this.api.get('/supplements', { params });
    return response.data;
  }

  async getSupplement(supplementId: string) {
    let response = await this.api.get(`/supplements/${supplementId}`);
    return response.data;
  }

  async getSupplementItems(supplementId: string) {
    let response = await this.api.get(`/supplements/${supplementId}/items`);
    return response.data;
  }

  async getSupplementNotations(supplementId: string) {
    let response = await this.api.get(`/supplements/${supplementId}/notations`);
    return response.data;
  }

  // --- Payments ---

  async getJobPayments(jobId: string) {
    let response = await this.api.get(`/jobs/${jobId}/payments`);
    return response.data;
  }

  async getJobPaymentsOverview(jobId: string) {
    let response = await this.api.get(`/jobs/${jobId}/payments/overview`);
    return response.data;
  }

  async createReceivedPayment(
    jobId: string,
    data: {
      amount: number;
      date?: string;
      paymentMethod?: string;
      referenceNumber?: string;
      accountTypeId?: string;
      description?: string;
    }
  ) {
    let response = await this.api.post(`/jobs/${jobId}/payments/received`, data);
    return response.data;
  }

  async createPaidPayment(
    jobId: string,
    data: {
      amount: number;
      date?: string;
      paymentMethod?: string;
      referenceNumber?: string;
      accountTypeId?: string;
      description?: string;
    }
  ) {
    let response = await this.api.post(`/jobs/${jobId}/payments/paid`, data);
    return response.data;
  }

  async createAdditionalExpense(
    jobId: string,
    data: {
      amount: number;
      date?: string;
      description?: string;
      accountTypeId?: string;
    }
  ) {
    let response = await this.api.post(`/jobs/${jobId}/payments/additional-expenses`, data);
    return response.data;
  }

  // --- Calendar & Appointments ---

  async getCalendars() {
    let response = await this.api.get('/calendars');
    return response.data;
  }

  async getAppointments(
    calendarId: string,
    params?: {
      startDate?: string;
      endDate?: string;
      pageSize?: number;
      pageStartIndex?: number;
    }
  ) {
    let response = await this.api.get(`/calendars/${calendarId}/appointments`, { params });
    return response.data;
  }

  async getAppointment(calendarId: string, appointmentId: string) {
    let response = await this.api.get(
      `/calendars/${calendarId}/appointments/${appointmentId}`
    );
    return response.data;
  }

  async getJobInitialAppointment(jobId: string) {
    let response = await this.api.get(`/jobs/${jobId}/appointments/initial`);
    return response.data;
  }

  async setJobInitialAppointment(
    jobId: string,
    data: {
      startDateTime?: string;
      endDateTime?: string;
      calendarId?: string;
      description?: string;
    }
  ) {
    let response = await this.api.put(`/jobs/${jobId}/appointments/initial`, data);
    return response.data;
  }

  // --- Measurements ---

  async createMeasurement(jobId: string, data: Record<string, any>) {
    let response = await this.api.post(`/jobs/${jobId}/measurements`, data);
    return response.data;
  }

  async createMeasurementOrder(jobId: string, data: Record<string, any>) {
    let response = await this.api.post(`/jobs/${jobId}/measurements/orders`, data);
    return response.data;
  }

  // --- Documents & Media ---

  async uploadDocument(
    jobId: string,
    data: {
      fileName: string;
      fileContent: string;
      folderId?: string;
      description?: string;
    }
  ) {
    let response = await this.api.post(`/jobs/${jobId}/documents`, data);
    return response.data;
  }

  async uploadPhotoVideo(
    jobId: string,
    data: {
      fileName: string;
      fileContent: string;
      tagId?: string;
      description?: string;
    }
  ) {
    let response = await this.api.post(`/jobs/${jobId}/photos-videos`, data);
    return response.data;
  }

  // --- Messages ---

  async createJobMessage(
    jobId: string,
    data: {
      subject?: string;
      body: string;
    }
  ) {
    let response = await this.api.post(`/jobs/${jobId}/messages`, data);
    return response.data;
  }

  async replyToJobMessage(
    jobId: string,
    messageId: string,
    data: {
      body: string;
    }
  ) {
    let response = await this.api.post(`/jobs/${jobId}/messages/${messageId}/replies`, data);
    return response.data;
  }

  // --- Users ---

  async getUsers() {
    let response = await this.api.get('/users');
    return response.data;
  }

  async getUser(userId: string) {
    let response = await this.api.get(`/users/${userId}`);
    return response.data;
  }

  // --- Company Settings ---

  async getCompanySettings() {
    let response = await this.api.get('/company-settings');
    return response.data;
  }

  async getInsuranceCompanies() {
    let response = await this.api.get(
      '/company-settings/job-file-settings/insurance-companies'
    );
    return response.data;
  }

  async getJobCategories() {
    let response = await this.api.get('/company-settings/job-file-settings/job-categories');
    return response.data;
  }

  async getTradeTypes() {
    let response = await this.api.get('/company-settings/job-file-settings/trade-types');
    return response.data;
  }

  async getWorkTypes() {
    let response = await this.api.get('/company-settings/job-file-settings/work-types');
    return response.data;
  }

  async getLeadSources() {
    let response = await this.api.get('/company-settings/leads/lead-sources');
    return response.data;
  }

  async getDocumentFolders() {
    let response = await this.api.get('/company-settings/job-file-settings/document-folders');
    return response.data;
  }

  async getPhotoVideoTags() {
    let response = await this.api.get('/company-settings/job-file-settings/photo-video-tags');
    return response.data;
  }

  async getAccountTypes() {
    let response = await this.api.get('/company-settings/location-settings/account-types');
    return response.data;
  }

  async getLocationCountries() {
    let response = await this.api.get('/company-settings/location-settings/countries');
    return response.data;
  }

  async getLocationStates(countryId: string) {
    let response = await this.api.get(
      `/company-settings/location-settings/countries/${countryId}/states`
    );
    return response.data;
  }

  // --- Reports ---

  async getReportRuns(scheduleId: string) {
    let response = await this.api.get(`/reports/instances/${scheduleId}/runs`);
    return response.data;
  }

  async getReportInstance(instanceId: string) {
    let response = await this.api.get(`/reports/instances/${instanceId}`);
    return response.data;
  }

  async getLatestReportInstance(instanceId: string) {
    let response = await this.api.get(`/reports/instances/${instanceId}/latest`);
    return response.data;
  }

  async getReportRecipients(instanceId: string) {
    let response = await this.api.get(`/reports/instances/${instanceId}/recipients`);
    return response.data;
  }

  // --- Leads ---

  async getLeadHistory(leadId: string) {
    let response = await this.api.get(`/leads/${leadId}/history`);
    return response.data;
  }

  // --- Reference Data ---

  async getCountries() {
    let response = await this.api.get('/acculynx/countries');
    return response.data;
  }

  async getCountry(countryId: string) {
    let response = await this.api.get(`/acculynx/countries/${countryId}`);
    return response.data;
  }

  async getStates(countryId: string) {
    let response = await this.api.get(`/acculynx/countries/${countryId}/states`);
    return response.data;
  }

  async getUnitsOfMeasure() {
    let response = await this.api.get('/acculynx/units-of-measure');
    return response.data;
  }

  // --- Webhooks ---

  async getWebhookTopics() {
    let response = await this.webhooksApi.get('/topics');
    return response.data;
  }

  async getSubscriptions() {
    let response = await this.webhooksApi.get('/subscriptions');
    return response.data;
  }

  async createSubscription(data: {
    consumerUrl: string;
    techContact: string;
    topicNames: string[];
  }) {
    let response = await this.webhooksApi.post('/subscriptions', data);
    return response.data;
  }

  async getSubscription(subscriptionId: string) {
    let response = await this.webhooksApi.get(`/subscriptions/${subscriptionId}`);
    return response.data;
  }

  async updateSubscription(
    subscriptionId: string,
    data: {
      techContact?: string;
      topicNames?: string[];
    }
  ) {
    let response = await this.webhooksApi.put(`/subscriptions/${subscriptionId}`, data);
    return response.data;
  }

  async deleteSubscription(subscriptionId: string) {
    let response = await this.webhooksApi.delete(`/subscriptions/${subscriptionId}`);
    return response.data;
  }

  async sendTestEvent(subscriptionId: string) {
    let response = await this.webhooksApi.post(`/subscriptions/${subscriptionId}/test-event`);
    return response.data;
  }

  // --- Ping ---

  async ping() {
    let response = await this.api.get('/ping');
    return response.data;
  }
}
