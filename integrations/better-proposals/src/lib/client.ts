import { createAxios } from 'slates';

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.betterproposals.io',
      headers: {
        Bptoken: config.token
      }
    });
  }

  // --- Proposals ---

  async listProposals(page?: number): Promise<any> {
    let params: Record<string, any> = {};
    if (page !== undefined) params.page = page;
    let response = await this.axios.get('/proposal', { params });
    return response.data;
  }

  async listProposalsByStatus(status: string, page?: number): Promise<any> {
    let params: Record<string, any> = {};
    if (page !== undefined) params.page = page;
    let response = await this.axios.get(`/proposal/${status}`, { params });
    return response.data;
  }

  async getProposal(proposalId: string): Promise<any> {
    let response = await this.axios.get(`/proposal/${proposalId}`);
    return response.data;
  }

  async getProposalCount(): Promise<any> {
    let response = await this.axios.get('/proposal/count');
    return response.data;
  }

  async createProposal(params: {
    company?: string;
    cover?: string;
    template?: string;
    documentType?: string;
    brand?: string;
    currency?: string;
    tax?: boolean;
    taxLabel?: string;
    taxAmount?: string;
    contacts?: Array<{
      firstName: string;
      surname: string;
      email: string;
      signature?: boolean;
    }>;
    mergeTags?: Array<{ tag: string; value: string }>;
  }): Promise<any> {
    let body: Record<string, any> = {};

    if (params.company) body.Company = params.company;
    if (params.cover) body.Cover = params.cover;
    if (params.template) body.Template = params.template;
    if (params.documentType) body.DocumentType = params.documentType;
    if (params.brand) body.Brand = params.brand;
    if (params.currency) body.Currency = params.currency;
    if (params.tax !== undefined) body.Tax = params.tax;
    if (params.taxLabel) body.TaxLabel = params.taxLabel;
    if (params.taxAmount) body.TaxAmount = params.taxAmount;
    if (params.contacts) {
      body.Contacts = params.contacts.map(c => ({
        FirstName: c.firstName,
        Surname: c.surname,
        Email: c.email,
        Signature: c.signature ?? false
      }));
    }
    if (params.mergeTags) {
      body.MergeTags = JSON.stringify(params.mergeTags);
    }

    let response = await this.axios.post('/proposal/create', body);
    return response.data;
  }

  // --- Covers ---

  async createCover(params: {
    name?: string;
    background?: string;
    headline?: string;
  }): Promise<any> {
    let body: Record<string, any> = {};
    if (params.name) body.Name = params.name;
    if (params.background) body.Background = params.background;
    if (params.headline) body.Headline = params.headline;

    let response = await this.axios.post('/proposal/cover/create', body);
    return response.data;
  }

  // --- Templates ---

  async listTemplates(page?: number): Promise<any> {
    let params: Record<string, any> = {};
    if (page !== undefined) params.page = page;
    let response = await this.axios.get('/template', { params });
    return response.data;
  }

  async getTemplate(templateId: string): Promise<any> {
    let response = await this.axios.get(`/template/${templateId}`);
    return response.data;
  }

  // --- Document Types ---

  async listDocumentTypes(page?: number): Promise<any> {
    let params: Record<string, any> = {};
    if (page !== undefined) params.page = page;
    let response = await this.axios.get('/doctype', { params });
    return response.data;
  }

  async createDocumentType(params: { typeName: string; typeColour?: string }): Promise<any> {
    let body: Record<string, any> = {
      TypeName: params.typeName
    };
    if (params.typeColour) body.TypeColour = params.typeColour;

    let response = await this.axios.post('/doctype/create', body);
    return response.data;
  }

  // --- Quotes ---

  async listQuotes(page?: number): Promise<any> {
    let params: Record<string, any> = {};
    if (page !== undefined) params.page = page;
    let response = await this.axios.get('/quote', { params });
    return response.data;
  }

  async getQuote(quoteId: string): Promise<any> {
    let response = await this.axios.get(`/quote/${quoteId}`);
    return response.data;
  }

  // --- Companies ---

  async listCompanies(page?: number): Promise<any> {
    let params: Record<string, any> = {};
    if (page !== undefined) params.page = page;
    let response = await this.axios.get('/company', { params });
    return response.data;
  }

  async getCompany(companyId: string): Promise<any> {
    let response = await this.axios.get(`/company/${companyId}`);
    return response.data;
  }

  // --- Currencies ---

  async listCurrencies(): Promise<any> {
    let response = await this.axios.get('/currency');
    return response.data;
  }

  async getCurrency(currencyId: string): Promise<any> {
    let response = await this.axios.get(`/currency/${currencyId}`);
    return response.data;
  }

  // --- Settings ---

  async getSettings(): Promise<any> {
    let response = await this.axios.get('/settings');
    return response.data;
  }

  async getBrandSettings(): Promise<any> {
    let response = await this.axios.get('/settings/brand');
    return response.data;
  }

  async getMergeTags(): Promise<any> {
    let response = await this.axios.get('/settings/merge_tag');
    return response.data;
  }
}
