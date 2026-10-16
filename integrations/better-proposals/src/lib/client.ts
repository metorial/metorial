import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';

type Contact = {
  firstName: string;
  surname: string;
  email: string;
  signature?: boolean;
};

type ProposalFields = {
  company?: string;
  cover?: string;
  template?: string;
  documentType?: string;
  brand?: string;
  currency?: string;
  tax?: boolean;
  taxLabel?: string;
  taxAmount?: string;
  description?: string;
  contacts?: Contact[];
  mergeTags?: Array<{ tag: string; value: string }>;
};

let mapError = (error: unknown) =>
  buildApiServiceError(error, {
    providerLabel: 'Better Proposals',
    reason: 'better_proposals_api_error',
    extractResponse: (input, helpers) => helpers.getResponseWithBody(input)
  });

let proposalBody = (params: ProposalFields): Record<string, string | boolean | undefined> => {
  let body: Record<string, string | boolean | undefined> = {
    Company: params.company,
    Cover: params.cover,
    Template: params.template,
    DocumentType: params.documentType,
    Brand: params.brand,
    Currency: params.currency,
    Tax: params.tax,
    TaxLabel: params.taxLabel,
    TaxAmount: params.taxAmount,
    Description: params.description,
    MergeTags: params.mergeTags === undefined ? undefined : JSON.stringify(params.mergeTags)
  };
  params.contacts?.forEach((contact, index) => {
    body[`Contacts[${index}][FirstName]`] = contact.firstName;
    body[`Contacts[${index}][Surname]`] = contact.surname;
    body[`Contacts[${index}][Email]`] = contact.email;
    body[`Contacts[${index}][Signature]`] = contact.signature;
  });
  return body;
};

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.betterproposals.io',
      authHeader: { name: 'Bptoken', value: config.token },
      contentType: 'application/x-www-form-urlencoded',
      errorAdapter: mapError
    });
    this.axios.interceptors.response.use(response => {
      if (isApiErrorRecord(response.data) && response.data.status === 'error') {
        throw mapError({ response: { status: response.status, data: response.data } });
      }
      return response;
    });
  }

  private async post(
    path: string,
    body: Record<string, string | boolean | undefined>
  ): Promise<any> {
    let form = new URLSearchParams(
      Object.entries(pickDefined(body)).map(([key, value]): [string, string] => [
        key,
        typeof value === 'boolean' ? (value ? '1' : '0') : String(value)
      ])
    );
    let response = await this.axios.post(path, form);
    return response.data;
  }

  // --- Proposals ---

  async listProposals(page?: number, perPage?: number, documentTypeId?: string): Promise<any> {
    let params: Record<string, any> = {};
    if (page !== undefined) params.page = page;
    if (perPage !== undefined) params.per_page = perPage;
    if (documentTypeId !== undefined) params.type = documentTypeId;
    let response = await this.axios.get('/proposal', { params });
    return response.data;
  }

  async listProposalsByStatus(
    status: string,
    page?: number,
    perPage?: number,
    documentTypeId?: string
  ): Promise<any> {
    let params: Record<string, any> = {};
    if (page !== undefined) params.page = page;
    if (perPage !== undefined) params.per_page = perPage;
    if (documentTypeId !== undefined) params.type = documentTypeId;
    let response = await this.axios.get(`/proposal/${status}`, { params });
    return response.data;
  }

  async getProposal(proposalId: string): Promise<any> {
    let response = await this.axios.get(`/proposal/${encodeURIComponent(proposalId)}`);
    return response.data;
  }

  async getProposalCount(): Promise<any> {
    let response = await this.axios.get('/proposal/count');
    return response.data;
  }

  async createProposal(params: ProposalFields): Promise<any> {
    return this.post('/proposal/create', proposalBody(params));
  }

  async editProposal(proposalId: string, params: ProposalFields): Promise<any> {
    if (params.contacts?.length === 0) {
      throw createApiServiceError(
        'Provide at least one contact, or omit contacts to keep the existing contacts. This tool cannot clear all contacts with an empty list.',
        { reason: 'empty_proposal_contacts' }
      );
    }
    return this.post('/proposal/edit', { ID: proposalId, ...proposalBody(params) });
  }

  async generateDocumentLinks(params: {
    proposalId: string;
    signOrder?: boolean;
    recipients?: Array<{
      firstName: string;
      surname: string;
      email: string;
      requiredToSign?: boolean;
    }>;
  }): Promise<any> {
    return this.post('/proposal/links', {
      ID: params.proposalId,
      SignOrder: params.signOrder,
      Recipients:
        params.recipients === undefined
          ? undefined
          : JSON.stringify(
              params.recipients.map(recipient =>
                pickDefined({
                  FirstName: recipient.firstName,
                  Surname: recipient.surname,
                  Email: recipient.email,
                  RequiredToSign: recipient.requiredToSign
                })
              )
            )
    });
  }

  // --- Covers ---

  async createCover(params: {
    name?: string;
    background?: string;
    headline?: string;
    brandId?: string;
    subheader?: string;
    textColour?: string;
    textAlign?: string;
    buttonStyle?: string;
    buttonText?: string;
  }): Promise<any> {
    return this.post('/proposal/cover/create', {
      CoverName: params.name,
      BGColour: params.background,
      Headline: params.headline,
      BrandID: params.brandId,
      Subheader: params.subheader,
      TextColour: params.textColour,
      TextAlign: params.textAlign,
      ButtonStyle: params.buttonStyle,
      ButtonText: params.buttonText
    });
  }

  // --- Templates ---

  async listTemplates(page?: number, perPage?: number): Promise<any> {
    let params: Record<string, any> = {};
    if (page !== undefined) params.page = page;
    if (perPage !== undefined) params.per_page = perPage;
    let response = await this.axios.get('/template', { params });
    return response.data;
  }

  async getTemplate(templateId: string): Promise<any> {
    let response = await this.axios.get(`/template/${encodeURIComponent(templateId)}`);
    return response.data;
  }

  // --- Document Types ---

  async listDocumentTypes(page?: number, perPage?: number): Promise<any> {
    let params: Record<string, any> = {};
    if (page !== undefined) params.page = page;
    if (perPage !== undefined) params.per_page = perPage;
    let response = await this.axios.get('/doctype', { params });
    return response.data;
  }

  async createDocumentType(params: { typeName: string; typeColour?: string }): Promise<any> {
    return this.post('/doctype/create', {
      TypeName: params.typeName,
      TypeColour: params.typeColour
    });
  }

  // --- Quotes ---

  async listQuotes(page?: number, perPage?: number): Promise<any> {
    let params: Record<string, any> = {};
    if (page !== undefined) params.page = page;
    if (perPage !== undefined) params.per_page = perPage;
    let response = await this.axios.get('/quote', { params });
    return response.data;
  }

  async getQuote(quoteId: string): Promise<any> {
    let response = await this.axios.get(`/quote/${encodeURIComponent(quoteId)}`);
    return response.data;
  }

  async createQuote(companyId: string, templateId?: string): Promise<any> {
    return this.post('/quote/create', { CompanyID: companyId, TemplateID: templateId });
  }

  // --- Companies ---

  async listCompanies(page?: number, perPage?: number): Promise<any> {
    let params: Record<string, any> = {};
    if (page !== undefined) params.page = page;
    if (perPage !== undefined) params.per_page = perPage;
    let response = await this.axios.get('/company', { params });
    return response.data;
  }

  async getCompany(companyId: string): Promise<any> {
    let response = await this.axios.get(`/company/${encodeURIComponent(companyId)}`);
    return response.data;
  }

  async createCompany(companyName: string): Promise<any> {
    return this.post('/company/create', { CompanyName: companyName });
  }

  // --- Currencies ---

  async listCurrencies(page?: number, perPage?: number): Promise<any> {
    let response = await this.axios.get('/currency', {
      params: pickDefined({ page, per_page: perPage })
    });
    return response.data;
  }

  async getCurrency(currencyId: string): Promise<any> {
    let response = await this.axios.get(`/currency/${encodeURIComponent(currencyId)}`);
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

  async getMergeTags(page?: number, perPage?: number): Promise<any> {
    let response = await this.axios.get('/settings/merge_tag', {
      params: pickDefined({ page, per_page: perPage })
    });
    return response.data;
  }
}
