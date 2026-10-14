import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

let BASE_URL = 'https://api.paperform.co/v1';

export interface PaginationParams {
  skip?: number;
  limit?: number;
  sort?: 'ASC' | 'DESC';
  beforeDate?: string;
  afterDate?: string;
  beforeId?: string;
  afterId?: string;
}

export interface PaginatedResponse<T> {
  results: T[];
  total: number;
  has_more: boolean;
  limit: number;
  skip: number;
}

export interface Form {
  id: string;
  slug: string;
  custom_slug: string | null;
  space_id: number;
  title: string | null;
  description: string | null;
  cover_image_url: string | null;
  url: string;
  additional_urls: string[];
  live: boolean;
  tags: string[] | null;
  submission_count: number;
  created_at: string;
  updated_at: string;
  created_at_utc: string;
  updated_at_utc: string;
  account_timezone: string;
}

export interface FormField {
  key: string;
  title?: string | null;
  description?: string | null;
  required?: boolean | null;
  custom_key?: string | null;
  placeholder?: string | null;
  type: string;
  [key: string]: unknown;
}

export interface Submission {
  id: string;
  form_id: string;
  data: Record<string, unknown>;
  device: Record<string, unknown>;
  charge: Record<string, unknown> | null;
  pdfs: Record<string, unknown> | null;
  created_at: string;
  created_at_utc: string;
  account_timezone: string;
}

export interface PartialSubmission {
  id: string;
  form_id: string;
  data: Record<string, unknown>;
  created_at: string;
  created_at_utc: string;
  updated_at: string;
  updated_at_utc: string;
  account_timezone: string;
}

export interface Product {
  SKU: string;
  name: string | null;
  price: number | null;
  quantity: number | null;
  minimum: number | null;
  maximum: number | null;
  discountable: boolean | null;
  images: Array<{ url: string; width: number; height?: number }>;
  sold?: number;
}

export interface Coupon {
  code: string;
  enabled: boolean;
  target: string;
  discountAmount: number;
  discountPercentage: number;
  expiresAt: string | null;
}

export interface Space {
  id: string;
  name: string;
  [key: string]: unknown;
}

export interface Translation {
  id: string;
  [key: string]: unknown;
}

export interface Webhook {
  id: string;
  target_url: string;
  triggers: string[];
  created_at: string;
  updated_at: string;
  created_at_utc: string;
  updated_at_utc: string;
  account_timezone: string;
}

export interface PapersignDocument {
  id: string;
  name: string;
  status: string;
  folder: { id: number; name: string; parent_id: number | null; space_id: number } | null;
  space: {
    id: number;
    name: string;
    root_folder_id: number;
    allow_team_access: boolean;
  } | null;
  signers: Array<{
    key: string;
    name: string;
    email: string;
    phone?: string;
    job_title?: string;
    company?: string;
    custom_attributes?: Array<{ key: string; value: string }>;
  }>;
  variables: Array<{ key: string; name: string; value: string }>;
  created_at_utc: string;
  updated_at_utc: string;
  sent_at_utc: string | null;
  completed_at_utc: string | null;
}

export interface PapersignFolder {
  id: number;
  name: string;
  parent_id: number | null;
  space_id: number;
}

export interface PapersignSpace {
  id: number;
  name: string;
  root_folder_id: number;
  allow_team_access: boolean;
}

export interface PapersignWebhook {
  id: string;
  name: string;
  target_url: string;
  scope: string;
  triggers: string[];
  [key: string]: unknown;
}

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    this.axios = createAuthenticatedAxios({
      baseURL: BASE_URL,
      timeout: 30_000,
      authHeader: { value: `Bearer ${config.token}` },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Paperform',
          reason: 'paperform_api_error'
        })
    });
  }

  // ---- Forms ----

  async listForms(
    params?: PaginationParams & { search?: string }
  ): Promise<PaginatedResponse<Form>> {
    let response = await this.axios.get('/forms', {
      params: this.buildPaginationParams(params)
    });
    return this.readList(response.data, 'forms');
  }

  async getForm(slugOrId: string): Promise<Form> {
    let response = await this.axios.get(`/forms/${encodeURIComponent(slugOrId)}`);
    return this.readItem(response.data, 'form');
  }

  async updateForm(
    slugOrId: string,
    data: {
      title?: string | null;
      description?: string | null;
      disabled?: boolean;
      customSlug?: string | null;
      spaceId?: string | null;
      translationId?: string | null;
    }
  ): Promise<Form> {
    let response = await this.axios.put(`/forms/${encodeURIComponent(slugOrId)}`, {
      title: data.title,
      description: data.description,
      disabled: data.disabled,
      custom_slug: data.customSlug,
      space_id: data.spaceId,
      translation_id: data.translationId
    });
    return this.readItem(response.data, 'form');
  }

  // ---- Form Fields ----

  async listFormFields(
    slugOrId: string,
    params?: PaginationParams & { search?: string }
  ): Promise<PaginatedResponse<FormField>> {
    this.validatePagination(params);
    let fields = await this.getFormFieldCollection(slugOrId, params?.search);
    return this.paginateCollection(fields, params);
  }

  async getFormField(slugOrId: string, fieldKey: string): Promise<FormField> {
    let response = await this.axios.get(
      `/forms/${encodeURIComponent(slugOrId)}/fields/${encodeURIComponent(fieldKey)}`
    );
    return this.readItem(response.data, 'field');
  }

  async updateFormField(
    slugOrId: string,
    fieldKey: string,
    data: Record<string, unknown>
  ): Promise<FormField> {
    let response = await this.axios.put(
      `/forms/${encodeURIComponent(slugOrId)}/fields/${encodeURIComponent(fieldKey)}`,
      data
    );
    return response.data;
  }

  // ---- Submissions ----

  async listSubmissions(
    slugOrId: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<Submission>> {
    let response = await this.axios.get(`/forms/${encodeURIComponent(slugOrId)}/submissions`, {
      params: this.buildPaginationParams(params)
    });
    return this.readList(response.data, 'submissions');
  }

  async getSubmission(submissionId: string): Promise<Submission> {
    let response = await this.axios.get(`/submissions/${encodeURIComponent(submissionId)}`);
    return this.readItem(response.data, 'submission');
  }

  async deleteSubmission(submissionId: string): Promise<void> {
    await this.axios.delete(`/submissions/${encodeURIComponent(submissionId)}`);
  }

  // ---- Partial Submissions ----

  async listPartialSubmissions(
    slugOrId: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<PartialSubmission>> {
    let response = await this.axios.get(
      `/forms/${encodeURIComponent(slugOrId)}/partial-submissions`,
      {
        params: this.buildPaginationParams(params)
      }
    );
    return this.readList(response.data, 'partial-submissions');
  }

  async getPartialSubmission(submissionId: string): Promise<PartialSubmission> {
    let response = await this.axios.get(
      `/partial-submissions/${encodeURIComponent(submissionId)}`
    );
    return this.readItem(response.data, 'partial-submission');
  }

  async deletePartialSubmission(submissionId: string): Promise<void> {
    await this.axios.delete(`/partial-submissions/${encodeURIComponent(submissionId)}`);
  }

  // ---- Products ----

  async listProducts(
    slugOrId: string,
    params?: PaginationParams & { search?: string }
  ): Promise<PaginatedResponse<Product>> {
    this.validatePagination(params);
    let response = await this.axios.get(`/forms/${encodeURIComponent(slugOrId)}/products`, {
      params: { search: params?.search }
    });
    return this.paginateCollection(
      this.readCollection<Product>(response.data, 'products'),
      params
    );
  }

  async createProduct(
    slugOrId: string,
    data: {
      SKU: string;
      productFieldKey?: string;
      name: string;
      price: number;
      quantity?: number;
      minimum?: number;
      maximum?: number;
      discountable?: boolean;
      images?: Array<{ url: string; width: number; height: number }>;
    }
  ): Promise<Product> {
    let { productFieldKey, ...product } = data;
    if (!productFieldKey) {
      let fields = await this.getFormFieldCollection(slugOrId);
      let productFields = fields.filter(field => field.type === 'products');
      if (productFields.length !== 1) {
        throw createApiServiceError(
          'Provide productFieldKey from list_form_fields to select a product field on this form.'
        );
      }
      productFieldKey = productFields[0]!.key;
    }
    let response = await this.axios.post(`/forms/${encodeURIComponent(slugOrId)}/products`, {
      ...product,
      product_field_key: productFieldKey
    });
    return this.readItem(response.data, 'product');
  }

  async getProduct(slugOrId: string, sku: string): Promise<Product> {
    let response = await this.axios.get(
      `/forms/${encodeURIComponent(slugOrId)}/products/${encodeURIComponent(sku)}`
    );
    let results = this.readResults(response.data);
    let product = isApiErrorRecord(results.product)
      ? results.product
      : Array.isArray(results.products)
        ? results.products.find(item => isApiErrorRecord(item) && item.SKU === sku)
        : undefined;
    if (!isApiErrorRecord(product)) {
      throw createApiServiceError('Paperform did not return the requested product.', {
        reason: 'paperform_invalid_response'
      });
    }
    return product as unknown as Product;
  }

  async updateProduct(
    slugOrId: string,
    sku: string,
    data: {
      name?: string;
      price?: number;
      quantity?: number;
      minimum?: number;
      maximum?: number;
      discountable?: boolean;
      images?: Array<{ url: string; width: number; height: number }>;
    }
  ): Promise<Product> {
    let response = await this.axios.put(
      `/forms/${encodeURIComponent(slugOrId)}/products/${encodeURIComponent(sku)}`,
      data
    );
    return this.readItem(response.data, 'product');
  }

  async deleteProduct(slugOrId: string, sku: string): Promise<void> {
    await this.axios.delete(
      `/forms/${encodeURIComponent(slugOrId)}/products/${encodeURIComponent(sku)}`
    );
  }

  async updateProductQuantity(slugOrId: string, sku: string, quantity: number): Promise<void> {
    await this.axios.put(
      `/forms/${encodeURIComponent(slugOrId)}/products/${encodeURIComponent(sku)}/quantity`,
      { quantity }
    );
  }

  async updateProductSold(slugOrId: string, sku: string, sold: number): Promise<void> {
    await this.axios.put(
      `/forms/${encodeURIComponent(slugOrId)}/products/${encodeURIComponent(sku)}/sold`,
      { sold }
    );
  }

  // ---- Coupons ----

  async listCoupons(
    slugOrId: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<Coupon>> {
    this.validatePagination(params);
    let response = await this.axios.get(`/forms/${encodeURIComponent(slugOrId)}/coupons`);
    return this.paginateCollection(
      this.readCollection<Coupon>(response.data, 'coupons'),
      params
    );
  }

  async createCoupon(
    slugOrId: string,
    data: {
      code: string;
      enabled?: boolean;
      target?: string;
      discountAmount?: number;
      discountPercentage?: number;
      expiresAt?: string | null;
    }
  ): Promise<Coupon> {
    let response = await this.axios.post(
      `/forms/${encodeURIComponent(slugOrId)}/coupons`,
      data
    );
    return this.readItem(response.data, 'coupon');
  }

  async getCoupon(slugOrId: string, code: string): Promise<Coupon> {
    let response = await this.axios.get(
      `/forms/${encodeURIComponent(slugOrId)}/coupons/${encodeURIComponent(code)}`
    );
    return response.data;
  }

  async updateCoupon(
    slugOrId: string,
    code: string,
    data: {
      enabled?: boolean;
      target?: string;
      discountAmount?: number;
      discountPercentage?: number;
      expiresAt?: string | null;
    }
  ): Promise<Coupon> {
    let response = await this.axios.put(
      `/forms/${encodeURIComponent(slugOrId)}/coupons/${encodeURIComponent(code)}`,
      data
    );
    return this.readItem(response.data, 'coupon');
  }

  async deleteCoupon(slugOrId: string, code: string): Promise<void> {
    await this.axios.delete(
      `/forms/${encodeURIComponent(slugOrId)}/coupons/${encodeURIComponent(code)}`
    );
  }

  // ---- Spaces ----

  async listSpaces(params?: PaginationParams): Promise<PaginatedResponse<Space>> {
    let response = await this.axios.get('/spaces', {
      params: this.buildPaginationParams(params)
    });
    return this.readList(response.data, 'spaces');
  }

  async createSpace(data: { name: string }): Promise<Space> {
    let response = await this.axios.post('/spaces', data);
    return this.readItem(response.data, 'space');
  }

  async getSpace(spaceId: string): Promise<Space> {
    let response = await this.axios.get(`/spaces/${encodeURIComponent(spaceId)}`);
    return response.data;
  }

  async updateSpace(spaceId: string, data: { name?: string }): Promise<Space> {
    let response = await this.axios.put(`/spaces/${encodeURIComponent(spaceId)}`, data);
    return response.data;
  }

  async listSpaceForms(
    spaceId: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<Form>> {
    this.validatePagination(params);
    let response = await this.axios.get(`/spaces/${encodeURIComponent(spaceId)}/forms`);
    return this.paginateCollection(this.readCollection<Form>(response.data, 'forms'), params);
  }

  // ---- Translations ----

  async listTranslations(params?: PaginationParams): Promise<PaginatedResponse<Translation>> {
    let response = await this.axios.get('/translations', {
      params: this.buildPaginationParams(params)
    });
    return response.data;
  }

  async createTranslation(data: Record<string, unknown>): Promise<Translation> {
    let response = await this.axios.post('/translations', data);
    return response.data;
  }

  async getTranslation(translationId: string): Promise<Translation> {
    let response = await this.axios.get(`/translations/${encodeURIComponent(translationId)}`);
    return response.data;
  }

  async updateTranslation(
    translationId: string,
    data: Record<string, unknown>
  ): Promise<Translation> {
    let response = await this.axios.put(
      `/translations/${encodeURIComponent(translationId)}`,
      data
    );
    return response.data;
  }

  async deleteTranslation(translationId: string): Promise<void> {
    await this.axios.delete(`/translations/${encodeURIComponent(translationId)}`);
  }

  // ---- Webhooks (Form) ----

  async listFormWebhooks(
    slugOrId: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<Webhook>> {
    let response = await this.axios.get(`/forms/${encodeURIComponent(slugOrId)}/webhooks`, {
      params: this.buildPaginationParams(params)
    });
    return response.data;
  }

  async createFormWebhook(
    slugOrId: string,
    data: {
      targetUrl: string;
      triggers: string[];
    }
  ): Promise<Webhook> {
    let response = await this.axios.post(`/forms/${encodeURIComponent(slugOrId)}/webhooks`, {
      target_url: data.targetUrl,
      triggers: data.triggers
    });
    return response.data;
  }

  async getWebhook(webhookId: string): Promise<Webhook> {
    let response = await this.axios.get(`/webhooks/${encodeURIComponent(webhookId)}`);
    return response.data;
  }

  async updateWebhook(
    webhookId: string,
    data: {
      targetUrl?: string;
      triggers?: string[];
    }
  ): Promise<Webhook> {
    let response = await this.axios.put(`/webhooks/${encodeURIComponent(webhookId)}`, {
      target_url: data.targetUrl,
      triggers: data.triggers
    });
    return response.data;
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    await this.axios.delete(`/webhooks/${encodeURIComponent(webhookId)}`);
  }

  // ---- Papersign Documents ----

  async listPapersignDocuments(
    params?: PaginationParams & {
      folderId?: string;
      search?: string;
      spaceId?: string;
      status?: string[];
    }
  ): Promise<PaginatedResponse<PapersignDocument>> {
    let queryParams: Record<string, unknown> = this.buildPaginationParams(params);
    if (params?.folderId) queryParams.folder_id = params.folderId;
    if (params?.search) queryParams.search = params.search;
    if (params?.spaceId) queryParams.space_id = params.spaceId;
    if (params?.status)
      queryParams.status = params.status.map(status =>
        status === 'in_progress' ? 'inProgress' : status
      );
    let response = await this.axios.get('/papersign/documents', { params: queryParams });
    return this.readList(response.data, 'documents');
  }

  async getPapersignDocument(documentId: string): Promise<PapersignDocument> {
    let response = await this.axios.get(
      `/papersign/documents/${encodeURIComponent(documentId)}`
    );
    return this.readItem(response.data, 'document');
  }

  async sendPapersignDocument(
    documentId: string,
    data: {
      expiration?: string;
      inviteMessage?: string;
      fromUserEmail?: string;
      documentRecipientEmails?: string[];
      automaticReminders?: { firstAfterDays?: number; followUpEveryDays?: number };
      signers?: Array<{
        key: string;
        name: string;
        email: string;
        phone?: string;
        jobTitle?: string;
        company?: string;
      }>;
      variables?: Array<{ key: string; name: string; value: string }>;
      copy?: boolean | { name?: string; spaceId?: number; path?: string; folderId?: number };
    }
  ): Promise<PapersignDocument> {
    let body: Record<string, unknown> = {};
    if (data.expiration !== undefined) body.expiration = data.expiration;
    if (data.inviteMessage !== undefined) body.invite_message = data.inviteMessage;
    if (data.fromUserEmail !== undefined) body.from_user_email = data.fromUserEmail;
    if (data.documentRecipientEmails !== undefined)
      body.document_recipient_emails = data.documentRecipientEmails;
    if (data.automaticReminders !== undefined) {
      body.automatic_reminders = {
        first_after_days: data.automaticReminders.firstAfterDays,
        follow_up_every_days: data.automaticReminders.followUpEveryDays
      };
    }
    if (data.signers !== undefined) {
      body.signers = data.signers.map(s => ({
        key: s.key,
        name: s.name,
        email: s.email,
        phone: s.phone,
        job_title: s.jobTitle,
        company: s.company
      }));
    }
    if (data.variables !== undefined) body.variables = data.variables;
    if (data.copy !== undefined) {
      if (typeof data.copy === 'boolean') {
        body.copy = data.copy;
      } else {
        body.copy = {
          name: data.copy.name,
          space_id: data.copy.spaceId,
          path: data.copy.path,
          folder_id: data.copy.folderId
        };
      }
    }
    let response = await this.axios.post(
      `/papersign/documents/${encodeURIComponent(documentId)}/send`,
      body
    );
    return this.readItem(response.data, 'document');
  }

  async copyPapersignDocument(
    documentId: string,
    data: {
      name?: string;
      spaceId?: number;
      path?: string;
      folderId?: number;
    }
  ): Promise<PapersignDocument> {
    let response = await this.axios.post(
      `/papersign/documents/${encodeURIComponent(documentId)}/copy`,
      {
        name: data.name,
        space_id: data.spaceId,
        path: data.path,
        folder_id: data.folderId
      }
    );
    return this.readItem(response.data, 'document');
  }

  async movePapersignDocument(
    documentId: string,
    data: {
      name?: string;
      spaceId?: number;
      path?: string;
      folderId?: number;
    }
  ): Promise<PapersignDocument> {
    let response = await this.axios.post(
      `/papersign/documents/${encodeURIComponent(documentId)}/move`,
      {
        name: data.name,
        space_id: data.spaceId,
        path: data.path,
        folder_id: data.folderId
      }
    );
    return this.readItem(response.data, 'document');
  }

  async cancelPapersignDocument(documentId: string): Promise<PapersignDocument> {
    let response = await this.axios.put(
      `/papersign/documents/${encodeURIComponent(documentId)}/cancel`
    );
    return this.readItem(response.data, 'document');
  }

  // ---- Papersign Folders ----

  async listPapersignFolders(): Promise<PaginatedResponse<PapersignFolder>> {
    let response = await this.axios.get('/papersign/folders');
    return this.readList(response.data, 'folders');
  }

  async createPapersignFolder(data: {
    name: string;
    spaceId?: number;
    parentId?: number;
  }): Promise<PapersignFolder> {
    let response = await this.axios.post('/papersign/folders', {
      name: data.name,
      space_id: data.spaceId,
      parent_id: data.parentId
    });
    return this.readItem(response.data, 'folder');
  }

  // ---- Papersign Spaces ----

  async listPapersignSpaces(): Promise<PaginatedResponse<PapersignSpace>> {
    let response = await this.axios.get('/papersign/spaces');
    return this.readList(response.data, 'spaces');
  }

  // ---- Papersign Webhooks ----

  async listPapersignFolderWebhooks(
    folderId: string
  ): Promise<PaginatedResponse<PapersignWebhook>> {
    let response = await this.axios.get(
      `/papersign/folders/${encodeURIComponent(folderId)}/webhooks`
    );
    return response.data;
  }

  async createPapersignWebhook(
    folderId: string,
    data: {
      name: string;
      targetUrl: string;
      scope: 'folder.direct_children' | 'folder.all_descendants';
      triggers: string[];
    }
  ): Promise<PapersignWebhook> {
    let response = await this.axios.post(
      `/papersign/folders/${encodeURIComponent(folderId)}/webhooks`,
      {
        name: data.name,
        target_url: data.targetUrl,
        scope: data.scope,
        triggers: data.triggers
      }
    );
    return response.data;
  }

  async updatePapersignWebhook(
    webhookId: string,
    data: {
      name?: string;
      targetUrl?: string;
      scope?: 'folder.direct_children' | 'folder.all_descendants';
      triggers?: string[];
    }
  ): Promise<PapersignWebhook> {
    let body: Record<string, unknown> = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.targetUrl !== undefined) body.target_url = data.targetUrl;
    if (data.scope !== undefined) body.scope = data.scope;
    if (data.triggers !== undefined) body.triggers = data.triggers;
    let response = await this.axios.put(
      `/papersign/webhooks/${encodeURIComponent(webhookId)}`,
      body
    );
    return response.data;
  }

  async deletePapersignWebhook(webhookId: string): Promise<void> {
    await this.axios.delete(`/papersign/webhooks/${encodeURIComponent(webhookId)}`);
  }

  // ---- Helpers ----

  private readResults(data: unknown): Record<string, unknown> {
    if (!isApiErrorRecord(data) || !isApiErrorRecord(data.results)) {
      throw createApiServiceError('Paperform returned an invalid response envelope.', {
        reason: 'paperform_invalid_response'
      });
    }
    return data.results;
  }

  private readItem<T>(data: unknown, key: string): T {
    let value = this.readResults(data)[key];
    if (!isApiErrorRecord(value)) {
      throw createApiServiceError(`Paperform did not return the expected ${key}.`, {
        reason: 'paperform_invalid_response'
      });
    }
    return value as T;
  }

  private readCollection<T>(data: unknown, key: string): T[] {
    let results = this.readResults(data)[key];
    if (!Array.isArray(results)) {
      throw createApiServiceError(`Paperform returned an invalid ${key} collection.`, {
        reason: 'paperform_invalid_response'
      });
    }
    return results as T[];
  }

  private paginateCollection<T>(
    results: T[],
    params?: PaginationParams
  ): PaginatedResponse<T> {
    let skip = params?.skip ?? 0;
    let limit = params?.limit ?? 20;
    let page = results.slice(skip, skip + limit);
    return {
      results: page,
      total: results.length,
      has_more: skip + page.length < results.length,
      limit,
      skip
    };
  }

  private async getFormFieldCollection(
    slugOrId: string,
    search?: string
  ): Promise<FormField[]> {
    let response = await this.axios.get(`/forms/${encodeURIComponent(slugOrId)}/fields`, {
      params: { search }
    });
    return this.readCollection(response.data, 'fields');
  }

  private readList<T>(data: unknown, key: string): PaginatedResponse<T> {
    let results = this.readResults(data)[key];
    if (
      !Array.isArray(results) ||
      !isApiErrorRecord(data) ||
      typeof data.total !== 'number' ||
      typeof data.has_more !== 'boolean' ||
      typeof data.limit !== 'number' ||
      typeof data.skip !== 'number'
    ) {
      throw createApiServiceError(`Paperform returned an invalid ${key} page.`, {
        reason: 'paperform_invalid_response'
      });
    }
    return {
      results: results as T[],
      total: data.total,
      has_more: data.has_more,
      limit: data.limit,
      skip: data.skip
    };
  }

  private validatePagination(params?: PaginationParams): void {
    if (!params) return;
    if (
      params.limit !== undefined &&
      (!Number.isInteger(params.limit) || params.limit < 1 || params.limit > 100)
    ) {
      throw createApiServiceError('limit must be a whole number between 1 and 100.');
    }
    if (params.skip !== undefined && (!Number.isInteger(params.skip) || params.skip < 0)) {
      throw createApiServiceError('skip must be a non-negative whole number.');
    }
  }

  private buildPaginationParams(
    params?: PaginationParams & { search?: string }
  ): Record<string, unknown> {
    let query: Record<string, unknown> = {};
    if (!params) return query;
    this.validatePagination(params);
    if (params.skip !== undefined) query.skip = params.skip;
    if (params.limit !== undefined) query.limit = params.limit;
    if (params.sort !== undefined) query.sort = params.sort;
    if (params.beforeDate !== undefined) query.before_date = params.beforeDate;
    if (params.afterDate !== undefined) query.after_date = params.afterDate;
    if (params.beforeId !== undefined) query.before_id = params.beforeId;
    if (params.afterId !== undefined) query.after_id = params.afterId;
    if (params.search !== undefined) query.search = params.search;
    return query;
  }
}
