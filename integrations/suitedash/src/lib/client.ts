import { createAxios } from 'slates';

let http = createAxios({
  baseURL: 'https://app.suitedash.com/secure-api'
});

export interface ClientConfig {
  publicId: string;
  secretKey: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    pagination: {
      totalPages: number;
      currentPage: number;
      total: number;
    };
  };
}

export interface ContactInput {
  first_name: string;
  last_name: string;
  email?: string;
  role: string;
  send_welcome_email?: boolean;
  [key: string]: unknown;
}

export interface CompanyInput {
  name: string;
  role: string;
  primaryContact?: {
    first_name: string;
    last_name: string;
    email: string;
    send_welcome_email?: boolean;
    create_primary_contact_if_not_exists?: boolean;
    prevent_individual_mode?: boolean;
  };
  [key: string]: unknown;
}

export interface CompanyUpdateInput {
  name?: string;
  website?: string;
  phone?: string;
  full_address?: string;
  tags?: string[];
  background_info?: string;
  [key: string]: unknown;
}

export interface MarketingSubscribeInput {
  contacts: string[];
  audience: string;
}

export class Client {
  private publicId: string;
  private secretKey: string;

  constructor(config: ClientConfig) {
    this.publicId = config.publicId;
    this.secretKey = config.secretKey;
  }

  private get headers() {
    return {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Public-ID': this.publicId,
      'X-Secret-Key': this.secretKey
    };
  }

  async listContacts(page: number = 1): Promise<PaginatedResponse<Record<string, unknown>>> {
    let response = await http.get('/contacts', {
      headers: this.headers,
      params: { page }
    });
    return response.data;
  }

  async listAllContacts(): Promise<Record<string, unknown>[]> {
    let allContacts: Record<string, unknown>[] = [];
    let page = 1;
    let totalPages = 1;

    do {
      let response = await this.listContacts(page);
      allContacts = allContacts.concat(response.data);
      totalPages = response.meta?.pagination?.totalPages ?? 1;
      page++;
    } while (page <= totalPages);

    return allContacts;
  }

  async createContact(data: ContactInput): Promise<Record<string, unknown>> {
    let response = await http.post('/contact', data, {
      headers: this.headers
    });
    return response.data;
  }

  async updateContact(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    let response = await http.put('/contact', data, {
      headers: this.headers
    });
    return response.data;
  }

  async listCompanies(page: number = 1): Promise<PaginatedResponse<Record<string, unknown>>> {
    let response = await http.get('/companies', {
      headers: this.headers,
      params: { page }
    });
    return response.data;
  }

  async listAllCompanies(): Promise<Record<string, unknown>[]> {
    let allCompanies: Record<string, unknown>[] = [];
    let page = 1;
    let totalPages = 1;

    do {
      let response = await this.listCompanies(page);
      allCompanies = allCompanies.concat(response.data);
      totalPages = response.meta?.pagination?.totalPages ?? 1;
      page++;
    } while (page <= totalPages);

    return allCompanies;
  }

  async createCompany(data: CompanyInput): Promise<Record<string, unknown>> {
    let response = await http.post('/company', data, {
      headers: this.headers
    });
    return response.data;
  }

  async updateCompany(
    companyId: string,
    data: CompanyUpdateInput
  ): Promise<Record<string, unknown>> {
    let response = await http.put(`/company/${companyId}`, data, {
      headers: this.headers
    });
    return response.data;
  }

  async getContactMeta(): Promise<Record<string, unknown>> {
    let response = await http.get('/contact/meta', {
      headers: this.headers
    });
    return response.data;
  }

  async subscribeToMarketingAudience(
    data: MarketingSubscribeInput
  ): Promise<Record<string, unknown>> {
    let response = await http.post('/marketing/subscribe', data, {
      headers: this.headers
    });
    return response.data;
  }
}
