import { createAxios } from 'slates';

export class TavePublicClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(private token: string) {
    this.axios = createAxios({
      baseURL: 'https://tave.io/v2'
    });
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    };
  }

  // Contacts
  async listContacts(params?: {
    contactKind?: string;
    brand?: string;
    page?: number;
    perPage?: number;
    since?: string;
  }) {
    let queryParams: Record<string, string> = {};
    if (params?.contactKind) queryParams.contact_kind = params.contactKind;
    if (params?.brand) queryParams.brand = params.brand;
    if (params?.page) queryParams.page = String(params.page);
    if (params?.perPage) queryParams.per_page = String(params.perPage);
    if (params?.since) queryParams.since = params.since;

    let response = await this.axios.get('/contacts', {
      headers: this.headers,
      params: queryParams
    });
    return response.data;
  }

  async getContact(contactId: string) {
    let response = await this.axios.get(`/contacts/${contactId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async createContact(data: Record<string, unknown>) {
    let response = await this.axios.post('/contacts', data, {
      headers: this.headers
    });
    return response.data;
  }

  async searchContacts(
    query: string,
    params?: {
      contactKind?: string;
      brand?: string;
      page?: number;
      perPage?: number;
    }
  ) {
    let queryParams: Record<string, string> = { q: query };
    if (params?.contactKind) queryParams.contact_kind = params.contactKind;
    if (params?.brand) queryParams.brand = params.brand;
    if (params?.page) queryParams.page = String(params.page);
    if (params?.perPage) queryParams.per_page = String(params.perPage);

    let response = await this.axios.get('/contacts', {
      headers: this.headers,
      params: queryParams
    });
    return response.data;
  }

  // Jobs
  async listJobs(params?: {
    jobType?: string;
    brand?: string;
    page?: number;
    perPage?: number;
  }) {
    let queryParams: Record<string, string> = {};
    if (params?.jobType) queryParams.job_type = params.jobType;
    if (params?.brand) queryParams.brand = params.brand;
    if (params?.page) queryParams.page = String(params.page);
    if (params?.perPage) queryParams.per_page = String(params.perPage);

    let response = await this.axios.get('/jobs', {
      headers: this.headers,
      params: queryParams
    });
    return response.data;
  }

  async getJob(jobId: string) {
    let response = await this.axios.get(`/jobs/${jobId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async createJob(data: Record<string, unknown>) {
    let response = await this.axios.post('/jobs', data, {
      headers: this.headers
    });
    return response.data;
  }

  // Orders
  async listOrders(params?: {
    brand?: string;
    jobType?: string;
    page?: number;
    perPage?: number;
    since?: string;
  }) {
    let queryParams: Record<string, string> = {};
    if (params?.brand) queryParams.brand = params.brand;
    if (params?.jobType) queryParams.job_type = params.jobType;
    if (params?.page) queryParams.page = String(params.page);
    if (params?.perPage) queryParams.per_page = String(params.perPage);
    if (params?.since) queryParams.since = params.since;

    let response = await this.axios.get('/orders', {
      headers: this.headers,
      params: queryParams
    });
    return response.data;
  }

  async getOrder(orderId: string) {
    let response = await this.axios.get(`/orders/${orderId}`, {
      headers: this.headers
    });
    return response.data;
  }

  // Payments
  async listPayments(params?: {
    brand?: string;
    jobType?: string;
    page?: number;
    perPage?: number;
    since?: string;
  }) {
    let queryParams: Record<string, string> = {};
    if (params?.brand) queryParams.brand = params.brand;
    if (params?.jobType) queryParams.job_type = params.jobType;
    if (params?.page) queryParams.page = String(params.page);
    if (params?.perPage) queryParams.per_page = String(params.perPage);
    if (params?.since) queryParams.since = params.since;

    let response = await this.axios.get('/payments', {
      headers: this.headers,
      params: queryParams
    });
    return response.data;
  }

  async getPayment(paymentId: string) {
    let response = await this.axios.get(`/payments/${paymentId}`, {
      headers: this.headers
    });
    return response.data;
  }

  // Brands
  async listBrands() {
    let response = await this.axios.get('/brands', {
      headers: this.headers
    });
    return response.data;
  }
}

export class TaveLeadClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(
    private secretKey: string,
    private studioId: string
  ) {
    this.axios = createAxios({
      baseURL: 'https://tave.com/app/webservice'
    });
  }

  async createLead(data: Record<string, unknown>) {
    let payload = {
      SecretKey: this.secretKey,
      ...data
    };

    let response = await this.axios.post(`/create-lead/${this.studioId}`, payload, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });
    return response.data;
  }
}
