import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';

let BASE_URL = 'https://api.ascora.com.au';
let ACCOUNTING_BASE_URL = 'https://www.ascora.com.au/acct/api';

let createAscoraHttp = (config: Parameters<typeof createAuthenticatedAxios>[0]) => {
  let http = createAuthenticatedAxios({
    timeout: 30_000,
    ...config,
    errorAdapter: error =>
      buildApiServiceError(error, {
        providerLabel: 'Ascora',
        reason: 'ascora_api_error',
        detailKeys: ['message', 'Message', 'error', 'Error', 'errorMessage', 'MessageText'],
        nestedKeys: ['errors', 'Errors', 'ResponseStatus'],
        extractResponse: (error, helpers) => {
          let response = helpers.getResponse(error);
          if (helpers.isRecord(error) && helpers.isRecord(error.data)) {
            let baggage = error.data.baggage;
            if (helpers.isRecord(baggage) && baggage.response !== undefined) {
              return { ...response, data: baggage.response };
            }
          }
          return response;
        }
      })
  });

  http.interceptors.response.use(response => {
    let data = response.data;
    if (isApiErrorRecord(data) && (data.success === false || data.Success === false)) {
      throw buildApiServiceError(
        { response: { status: response.status, data } },
        {
          providerLabel: 'Ascora',
          reason: 'ascora_api_error',
          detailKeys: ['message', 'Message', 'error', 'Error'],
          nestedKeys: ['errors', 'Errors', 'ResponseStatus'],
          fallbackMessage: 'Ascora did not accept the request.'
        }
      );
    }
    return response;
  });

  return http;
};

let getRecords = (data: unknown, entityKey?: string): any[] => {
  let records = isApiErrorRecord(data)
    ? (data.results ?? data.Results ?? (entityKey ? data[entityKey] : undefined))
    : data;
  if (!Array.isArray(records)) {
    throw createApiServiceError('Ascora returned an invalid record list.', {
      reason: 'ascora_invalid_response'
    });
  }
  return records;
};

export class AscoraClient {
  private token: string;

  constructor(config: { token: string; username?: string; password?: string }) {
    if (!config.token || config.username !== undefined || config.password !== undefined) {
      throw createApiServiceError(
        'An Ascora API key is required for customer, job and enquiry tools. Connect with the API Key authentication method.',
        { reason: 'ascora_api_key_required' }
      );
    }
    this.token = config.token;
  }

  private getAxios() {
    return createAscoraHttp({
      baseURL: BASE_URL,
      authHeader: { name: 'Auth', value: this.token }
    });
  }

  async listCustomers(
    filters: {
      customerType?: string;
      leadSource?: string;
      assignedUser?: string;
      siteBillingType?: string;
      filterText?: string;
      phoneNumber?: string;
      pageSize?: number;
      page?: number;
    } = {}
  ): Promise<{ customers: any[]; totalPages?: number; totalRecords?: number }> {
    let http = this.getAxios();
    let response = await http.get('/Customers/Customers', {
      params: pickDefined({
        CustomerType: filters.customerType,
        LeadSource: filters.leadSource,
        AssignedUser: filters.assignedUser,
        SiteBillingType: filters.siteBillingType,
        FilterText: filters.filterText,
        PhoneNumber: filters.phoneNumber,
        PageSize: filters.pageSize,
        Page: filters.page
      })
    });
    return {
      customers: getRecords(response.data),
      totalPages: response.data?.totalPages,
      totalRecords: response.data?.totalRecords
    };
  }

  async getCustomer(customerId: string): Promise<any> {
    let response = await this.getAxios().get(
      `/Customers/Customer/${encodeURIComponent(customerId)}`
    );
    let customer = response.data?.customer;
    if (!isApiErrorRecord(customer)) {
      throw createApiServiceError('Ascora did not return the requested customer.', {
        reason: 'ascora_invalid_response'
      });
    }
    return customer;
  }

  async listJobs(filters: {
    filterText?: string;
    jobStatus?: string;
    jobType?: string;
    assignedUser?: string;
    customerName?: string;
    includeChildJobs?: boolean;
    startDate?: string;
    endDate?: string;
    pageSize?: number;
    page?: number;
  }): Promise<{ jobs: any[]; totalPages?: number; totalRecords?: number }> {
    let response = await this.getAxios().get('/Jobs/Jobs', {
      params: pickDefined({
        FilterText: filters.filterText,
        JobStatus: filters.jobStatus,
        JobType: filters.jobType,
        AssignedUser: filters.assignedUser,
        CustomerName: filters.customerName,
        IncludeChildJobs: filters.includeChildJobs,
        StartDate: filters.startDate,
        EndDate: filters.endDate,
        PageSize: filters.pageSize,
        Page: filters.page
      })
    });
    return {
      jobs: getRecords(response.data, 'jobs'),
      totalPages: response.data?.totalPages,
      totalRecords: response.data?.totalRecords
    };
  }

  async getJob(jobNumber: string): Promise<any> {
    let response = await this.getAxios().get(`/Jobs/Job/${encodeURIComponent(jobNumber)}`);
    let job = response.data?.job;
    if (!isApiErrorRecord(job)) {
      throw createApiServiceError('Ascora did not return the requested job.', {
        reason: 'ascora_invalid_response'
      });
    }
    return job;
  }

  async submitEnquiry(enquiry: {
    companyName?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    mobile?: string;
    phone?: string;
    addressLine1?: string;
    addressLine2?: string;
    addressSuburb?: string;
    addressState?: string;
    addressPostcode?: string;
    addressCountry?: string;
    enquiryDescription?: string;
    leadSource?: string;
    customFields?: Array<{ fieldName: string; fieldValue: string }>;
  }): Promise<any> {
    let http = this.getAxios();
    let response = await http.post('/Enquiry', enquiry);
    return response.data;
  }
}

export class AscoraAccountingClient {
  private username: string;
  private password: string;

  constructor(config: { username: string; password: string }) {
    this.username = config.username;
    this.password = config.password;
  }

  private getAxios() {
    return createAscoraHttp({
      baseURL: ACCOUNTING_BASE_URL,
      auth: {
        username: this.username,
        password: this.password
      }
    });
  }

  async getInvoices(invoicesPriorToDate?: string, companyId?: string): Promise<any[]> {
    let http = this.getAxios();
    let path = companyId
      ? `/invoicedetails/${encodeURIComponent(companyId)}`
      : '/invoicedetails';
    let params: Record<string, string> = {};
    if (invoicesPriorToDate) {
      params.InvoicesPriorToDate = invoicesPriorToDate;
    }
    let response = await http.get(path, { params });
    let data = response.data;
    return getRecords(data);
  }

  async markInvoices(invoiceIds: string[]): Promise<any> {
    let http = this.getAxios();
    let response = await http.post('/MarkInvoice', {
      InvoiceIds: invoiceIds
    });
    return response.data;
  }

  async getPayments(): Promise<any[]> {
    let http = this.getAxios();
    let response = await http.get('/payments');
    let data = response.data;
    return getRecords(data);
  }

  async markPayments(paymentIds: string[]): Promise<any> {
    let http = this.getAxios();
    let response = await http.post('/MarkPayment', {
      PaymentIds: paymentIds
    });
    return response.data;
  }
}
