import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

let BASE_URL = 'https://api.acculynx.com/api/v2';
let WEBHOOKS_BASE_URL = 'https://api.acculynx.com/webhooks/v2';

export class Client {
  private api;
  private webhooksApi;

  constructor(config: { token: string }) {
    let errorAdapter = (error: unknown) =>
      buildApiServiceError(error, {
        providerLabel: 'AccuLynx',
        reason: 'acculynx_api_error',
        detailKeys: ['detail', 'title', 'message']
      });
    this.api = createAuthenticatedAxios({
      baseURL: BASE_URL,
      authHeader: { value: `Bearer ${config.token}` },
      errorAdapter
    });
    this.webhooksApi = createAuthenticatedAxios({
      baseURL: WEBHOOKS_BASE_URL,
      authHeader: { value: `Bearer ${config.token}` },
      errorAdapter
    });
  }

  private async resolveJobSettingId(
    path: string,
    value: string,
    label: string,
    idKey = 'id',
    numericId = false
  ): Promise<string | number> {
    if (numericId && /^\d+$/.test(value)) return Number(value);
    if (!numericId && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value))
      return value;

    let index = 0;
    while (index <= 100000) {
      let response = await this.api.get(path, {
        params: { pageSize: 25, recordStartIndex: index }
      });
      let result = response.data;
      let items: Record<string, any>[] = Array.isArray(result)
        ? result
        : (result?.items ?? []);
      let matches = items.filter(
        item =>
          typeof item.name === 'string' && item.name.toLowerCase() === value.toLowerCase()
      );
      if (matches.length === 1 && matches[0]?.[idKey] !== undefined) {
        return matches[0][idKey];
      }
      if (matches.length > 1) break;
      let nextIndex = index + items.length;
      if (
        items.length < 25 ||
        (typeof result?.count === 'number' && nextIndex >= result.count)
      ) {
        break;
      }
      index = nextIndex;
    }
    throw createApiServiceError(
      `The ${label} "${value}" could not be uniquely resolved. Provide its provider ID instead.`,
      { reason: 'invalid_acculynx_reference' }
    );
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
    let { pageStartIndex, filterByDate, ...rest } = params ?? {};
    let response = await this.api.get('/jobs', {
      params: {
        ...rest,
        recordStartIndex: pageStartIndex,
        dateFilterType: rest.dateFilterType ?? filterByDate
      }
    });
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
    tradeTypeIds?: string[];
    workTypeId?: number;
    leadSourceId?: string;
    jobCategoryId?: number;
    priority?: 'Urgent' | 'High' | 'Normal';
  }) {
    if (data.estimatedJobValue !== undefined || data.leadSourceChild !== undefined) {
      throw createApiServiceError(
        'The job creation API does not support estimatedJobValue or leadSourceChild. Omit these fields.',
        { reason: 'unsupported_acculynx_job_fields' }
      );
    }
    let tradeTypeIds = data.tradeTypeIds;
    if (!tradeTypeIds && data.tradeType) {
      tradeTypeIds = [
        String(
          await this.resolveJobSettingId(
            '/company-settings/job-file-settings/trade-types',
            data.tradeType,
            'trade type',
            'tradeId'
          )
        )
      ];
    }
    let workTypeId = data.workTypeId;
    if (workTypeId === undefined && data.workType) {
      workTypeId = Number(
        await this.resolveJobSettingId(
          '/company-settings/job-file-settings/work-types',
          data.workType,
          'work type',
          'id',
          true
        )
      );
    }
    let leadSourceId = data.leadSourceId;
    if (!leadSourceId && data.leadSource) {
      leadSourceId = String(
        await this.resolveJobSettingId(
          '/company-settings/leads/lead-sources',
          data.leadSource,
          'lead source'
        )
      );
    }
    let response = await this.api.post('/jobs', {
      contact: { id: data.contactId },
      tradeTypes: tradeTypeIds?.map(id => ({ id })),
      workType: workTypeId === undefined ? undefined : { id: workTypeId },
      leadSource: leadSourceId ? { id: leadSourceId } : undefined,
      jobCategory: data.jobCategoryId === undefined ? undefined : { id: data.jobCategoryId },
      priority: data.priority,
      notes: data.description
    });
    return response.data;
  }

  async searchJobs(data: {
    query?: string;
    pageSize?: number;
    pageStartIndex?: number;
    includes?: string;
    geoLocation?: { latitude: number; longitude: number; mapRadius?: number };
  }) {
    if (!data.query?.trim() && !data.geoLocation) {
      throw createApiServiceError('Provide a non-empty query or geoLocation to search jobs.', {
        reason: 'missing_acculynx_job_search'
      });
    }
    let response = await this.api.post(
      '/jobs/search',
      { searchTerm: data.query, geoLocation: data.geoLocation },
      {
        params: {
          pageSize: data.pageSize,
          recordStartIndex: data.pageStartIndex,
          includes: data.includes
        }
      }
    );
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

  private async resolveContactTypeId(value: string): Promise<string> {
    if (/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value)) return value;

    for (let pageStartIndex = 0; pageStartIndex <= 4000; pageStartIndex++) {
      let result = await this.getContactTypes({ pageSize: 25, pageStartIndex });
      let items: { id: string; name?: string }[] = Array.isArray(result)
        ? result
        : (result?.items ?? []);
      let matches = items.filter(
        item => item.name?.toLowerCase() === value.trim().toLowerCase()
      );
      if (matches.length === 1 && matches[0]?.id) return matches[0].id;
      if (
        matches.length > 1 ||
        items.length < 25 ||
        (typeof result?.count === 'number' && (pageStartIndex + 1) * 25 >= result.count)
      ) {
        break;
      }
    }
    throw createApiServiceError(
      `The contact type "${value}" could not be uniquely resolved. Provide a valid contact type name or ID.`,
      { reason: 'invalid_acculynx_contact_type' }
    );
  }

  private async resolveContactLocationId(
    value: string,
    label: 'country' | 'state',
    countryId?: number
  ): Promise<number> {
    let numericId = Number(value);
    if (/^\d+$/.test(value) && Number.isSafeInteger(numericId) && numericId > 0) {
      return numericId;
    }
    if (label === 'state' && countryId === undefined) {
      throw createApiServiceError(
        'Provide country when using a state name or abbreviation, or provide the numeric state ID.',
        { reason: 'missing_acculynx_contact_country' }
      );
    }
    let result =
      label === 'country'
        ? await this.getCountries()
        : await this.getStates(String(countryId));
    let items: { id: number; name?: string; abbreviation?: string }[] = Array.isArray(result)
      ? result
      : (result?.items ?? []);
    let matches = items.filter(item =>
      [item.name, item.abbreviation].some(
        name => typeof name === 'string' && name.toLowerCase() === value.trim().toLowerCase()
      )
    );
    if (matches.length === 1 && Number.isSafeInteger(matches[0]?.id)) return matches[0]!.id;
    throw createApiServiceError(
      `The ${label} "${value}" could not be uniquely resolved. Provide a valid name, abbreviation, or numeric ID.`,
      { reason: 'invalid_acculynx_contact_location' }
    );
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
    let phoneTypes: Record<string, 'Home' | 'Mobile' | 'Work'> = {
      home: 'Home',
      mobile: 'Mobile',
      work: 'Work'
    };
    let phoneNumbers = data.phoneNumbers?.map(phone => {
      let type = phoneTypes[(phone.type ?? 'Home').trim().toLowerCase()];
      if (!/^\d{10}$/.test(phone.phoneNumber) || !type) {
        throw createApiServiceError(
          'Each phone number must contain exactly 10 digits and use type Home, Mobile, or Work.',
          { reason: 'invalid_acculynx_contact_phone' }
        );
      }
      return { number: phone.phoneNumber, type, primary: phone.isPrimary };
    });
    let countryId =
      data.address?.country === undefined
        ? undefined
        : await this.resolveContactLocationId(data.address.country, 'country');
    let stateId =
      data.address?.state === undefined
        ? undefined
        : await this.resolveContactLocationId(data.address.state, 'state', countryId);
    let contactTypeId =
      data.contactType === undefined
        ? undefined
        : await this.resolveContactTypeId(data.contactType);
    let response = await this.api.post('/contacts', {
      firstName: data.firstName,
      lastName: data.lastName,
      companyName: data.companyName,
      contactTypeIds: contactTypeId === undefined ? undefined : [contactTypeId],
      mailingAddress: data.address
        ? {
            street1: data.address.street,
            city: data.address.city,
            zipCode: data.address.zip,
            state: stateId === undefined ? undefined : { id: stateId },
            country: countryId === undefined ? undefined : { id: countryId }
          }
        : undefined,
      emailAddresses: data.emailAddresses?.map(email => ({
        address: email.emailAddress,
        primary: email.isPrimary
      })),
      phoneNumbers
    });
    return response.data;
  }

  async searchContacts(data: {
    query?: string;
    pageSize?: number;
    pageStartIndex?: number;
    startDate?: string;
    endDate?: string;
    contactTypes?: string[];
    sortColumn?:
      | 'CreatedDate'
      | 'CompanyName'
      | 'ContactType'
      | 'firstName'
      | 'lastName'
      | 'LifeTimeValue';
    sortDirection?: 'Ascending' | 'Descending';
  }) {
    let startDate = data.startDate ?? '1970-01-01T00:00:00Z';
    let endDate = data.endDate ?? new Date().toISOString();
    if (
      !Number.isFinite(Date.parse(startDate)) ||
      !Number.isFinite(Date.parse(endDate)) ||
      Date.parse(startDate) > Date.parse(endDate)
    ) {
      throw createApiServiceError(
        'Provide valid startDate and endDate values in chronological order.',
        {
          reason: 'invalid_acculynx_contact_search_dates'
        }
      );
    }
    let response = await this.api.post(
      '/contacts/search',
      {
        searchTerm: data.query,
        contactTypes: data.contactTypes,
        startDate,
        endDate,
        sort: {
          sortColumn: data.sortColumn ?? 'CreatedDate',
          sortDirection: data.sortDirection ?? 'Ascending'
        }
      },
      { params: { pageSize: data.pageSize, pageStartIndex: data.pageStartIndex } }
    );
    return response.data;
  }

  async getContactTypes(params?: { pageSize?: number; pageStartIndex?: number }) {
    let response = await this.api.get('/contacts/contact-types', { params });
    return response.data;
  }

  async getContactJobs(
    contactId: string,
    params?: { pageSize?: number; recordStartIndex?: number }
  ) {
    let response = await this.api.get(`/contacts/${encodeURIComponent(contactId)}/jobs`, {
      params
    });
    return response.data;
  }

  async getJobCustomFields(
    jobId: string,
    params?: { pageSize?: number; recordStartIndex?: number }
  ) {
    let response = await this.api.get(`/jobs/${encodeURIComponent(jobId)}/custom-fields`, {
      params
    });
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
    let logTypes: Record<string, 'PhoneCall' | 'SMS' | 'Email'> = {
      phonecall: 'PhoneCall',
      sms: 'SMS',
      email: 'Email'
    };
    let type = logTypes[data.type?.replace(/\s+/g, '').toLowerCase() ?? ''];
    if (!type || !data.date) {
      throw createApiServiceError(
        'Provide a date and communication type PhoneCall, Phone Call, SMS, or Email to create a contact log.',
        { reason: 'invalid_acculynx_contact_log' }
      );
    }
    let dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(data.date);
    let isoTimestamp =
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/i.test(
        data.date
      );
    let timestamp = Date.parse(dateOnly ? `${data.date}T00:00:00Z` : data.date);
    let calendarDate = data.date.slice(0, 10);
    let calendarTimestamp = Date.parse(`${calendarDate}T00:00:00Z`);
    if (
      (!dateOnly && !isoTimestamp) ||
      !Number.isFinite(timestamp) ||
      !Number.isFinite(calendarTimestamp) ||
      new Date(calendarTimestamp).toISOString().slice(0, 10) !== calendarDate ||
      (data.description?.length ?? 0) > 1000
    ) {
      throw createApiServiceError(
        'Use a valid YYYY-MM-DD date or ISO 8601 timestamp with a timezone, and a description of at most 1000 characters.',
        { reason: 'invalid_acculynx_contact_log' }
      );
    }
    let logDate = new Date(timestamp).toISOString();
    let submittedLog = { logDate, type, description: data.description };
    await this.api.post(`/contacts/${encodeURIComponent(contactId)}/logs`, submittedLog);
    return { contactId, ...submittedLog, accepted: true };
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
    let response = await this.api.get(`/jobs/${jobId}/accounting/integration-status`);
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
    let response = await this.api.post(`/jobs/${jobId}/messages`, {
      message: data.subject ? `${data.subject}\n\n${data.body}` : data.body
    });
    return response.data;
  }

  async replyToJobMessage(
    jobId: string,
    messageId: string,
    data: {
      body: string;
    }
  ) {
    let response = await this.api.post(`/jobs/${jobId}/messages/${messageId}/replies`, {
      message: data.body
    });
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
