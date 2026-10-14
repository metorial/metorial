import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';
import { z } from 'zod';

let BASE_URL = 'https://api.signaturely.com/api/v1';
let idSchema = z.union([z.string().min(1), z.number()]).transform(String);
let optionalString = z.string().nullish();

let documentSchema = z
  .object({
    id: idSchema,
    title: optionalString,
    name: optionalString,
    status: optionalString,
    createdAt: optionalString,
    updatedAt: optionalString,
    signers: z
      .array(
        z
          .object({
            id: idSchema,
            name: optionalString,
            role: optionalString
          })
          .passthrough()
      )
      .nullish()
  })
  .passthrough();

let signerSchema = z
  .object({
    id: idSchema,
    name: optionalString,
    fullName: optionalString,
    email: optionalString,
    role: optionalString,
    status: optionalString,
    signedAt: optionalString,
    completedAt: optionalString,
    order: z.number().nullish(),
    isFinished: z.boolean().nullish(),
    isDeclined: z.boolean().nullish()
  })
  .passthrough();

let userSchema = z
  .object({
    id: idSchema,
    email: optionalString,
    name: optionalString,
    fullName: optionalString,
    role: optionalString,
    status: optionalString,
    avatarUrl: optionalString
  })
  .passthrough();

let paginationSchema = z
  .object({
    totalItems: z.number().nullish(),
    totalCount: z.number().nullish(),
    total: z.number().nullish(),
    currentPage: z.number().nullish(),
    totalPages: z.number().nullish()
  })
  .passthrough();

export type DocumentStatus = 'draft' | 'awaiting' | 'completed';
export type SearchType = 'documents' | 'signers';
export type OrderingDirection = 'ASC' | 'DESC';

export interface Signer {
  name: string;
  email: string;
  role: string;
  order?: number;
  fields?: Record<string, string>;
  checkboxFields?: Record<string, boolean>;
}

export interface CreateSignatureRequestParams {
  templateId: string;
  signers: Signer[];
  title?: string;
  message?: string;
  isOrdered?: boolean;
  testMode?: boolean;
}

export interface ListDocumentsParams {
  orderingKey?: string;
  orderingDirection?: OrderingDirection;
  searchType?: SearchType;
  searchTerm?: string;
  status?: DocumentStatus;
  limit?: number;
  offset?: number;
  page?: number;
}

export interface ListTemplatesParams {
  limit?: number;
  page?: number;
  withTeammateTemplates?: boolean;
}

let parseResponse = <T>(schema: z.ZodType<T>, value: unknown, operation: string): T => {
  let parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw createApiServiceError(`Signaturely returned an invalid ${operation} response.`, {
      reason: 'signaturely_invalid_response'
    });
  }
  return parsed.data;
};

let unwrapRecord = (value: unknown): unknown => {
  if (value && typeof value === 'object' && 'data' in value) {
    return value.data;
  }
  return value;
};

let parsePage = <T>(value: unknown, itemSchema: z.ZodType<T>) => {
  let schema = z.union([
    z.array(itemSchema),
    paginationSchema.extend({
      data: z.array(itemSchema).optional(),
      items: z.array(itemSchema).optional(),
      meta: paginationSchema.nullish()
    })
  ]);
  let result = parseResponse(schema, value, 'list');
  if (Array.isArray(result)) return { items: result, totalCount: undefined };
  let items = result.data ?? result.items;
  if (!items) {
    throw createApiServiceError(
      'Signaturely returned a list response without document data.',
      {
        reason: 'signaturely_invalid_response'
      }
    );
  }
  return {
    items,
    totalCount:
      result.totalItems ??
      result.meta?.totalItems ??
      result.totalCount ??
      result.total ??
      undefined
  };
};

let validatePagination = (limit: number, page: number) => {
  if (!Number.isSafeInteger(limit) || limit < 1 || !Number.isSafeInteger(page) || page < 1) {
    throw createApiServiceError('Provide positive whole numbers for limit and page.');
  }
};

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    if (!config.token?.trim()) {
      throw createApiServiceError(
        'A Signaturely API key is required. Reconnect with a valid key.'
      );
    }
    this.axios = createAuthenticatedAxios({
      baseURL: BASE_URL,
      timeout: 30000,
      authHeader: { value: `Api-Key ${config.token}` },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Signaturely',
          reason: 'signaturely_api_error'
        })
    });
  }

  async getUser() {
    let response = await this.axios.get('/user/by-api');
    return parseResponse(userSchema, unwrapRecord(response.data), 'account');
  }

  async listDocuments(params: ListDocumentsParams = {}) {
    let limit = params.limit ?? 25;
    let offset = params.offset ?? 0;
    if (!Number.isSafeInteger(offset) || offset < 0) {
      throw createApiServiceError('Provide a non-negative whole number for offset.');
    }
    if (params.page !== undefined && params.offset !== undefined) {
      throw createApiServiceError('Provide either page or offset, not both.');
    }
    let page = params.page ?? Math.floor(offset / limit) + 1;
    validatePagination(limit, page);
    let query = {
      limit,
      page,
      orderingKey: params.orderingKey ?? 'createdAt',
      orderingDirection: params.orderingDirection ?? 'DESC',
      searchType: params.searchType ?? 'documents',
      searchTerm: params.searchTerm,
      'status[]': params.status ? [params.status] : undefined
    };
    let response = await this.axios.get('/documents', { params: query });
    let result = parsePage(response.data, documentSchema);
    let skip = params.page === undefined ? offset % limit : 0;
    let items = result.items;
    if (skip && items.length === limit) {
      let next = await this.axios.get('/documents', { params: { ...query, page: page + 1 } });
      items = items.concat(parsePage(next.data, documentSchema).items);
    }
    return { ...result, items: items.slice(skip, skip + limit) };
  }

  async listTemplates(params: ListTemplatesParams = {}) {
    let limit = params.limit ?? 25;
    let page = params.page ?? 1;
    validatePagination(limit, page);
    let response = await this.axios.get('/documents/api/templates', {
      params: { limit, page, withTeammateTemplates: params.withTeammateTemplates }
    });
    return parsePage(response.data, documentSchema);
  }

  async getDocumentSigners(documentId: string) {
    let response = await this.axios.get(
      `/documents/${encodeURIComponent(documentId)}/signers`
    );
    return parsePage(response.data, signerSchema).items;
  }

  async createSignatureRequest(params: CreateSignatureRequestParams) {
    if (!params.signers.length) {
      throw createApiServiceError('Provide at least one signer for the signature request.');
    }
    if (
      params.isOrdered &&
      params.signers.some(
        signer =>
          signer.order === undefined || !Number.isSafeInteger(signer.order) || signer.order < 1
      )
    ) {
      throw createApiServiceError(
        'Provide a positive whole-number order for every signer when isOrdered is true.'
      );
    }
    if (
      params.signers.some(signer =>
        Object.keys(signer.checkboxFields ?? {}).some(key =>
          Object.hasOwn(signer.fields ?? {}, key)
        )
      )
    ) {
      throw createApiServiceError(
        'Use each template tag in either fields or checkboxFields, not both.'
      );
    }
    let response = await this.axios.post('/document_sign/api/request_by_template', {
      templateId: params.templateId,
      signers: params.signers.map(({ checkboxFields, fields, ...signer }) => ({
        ...signer,
        ...(fields || checkboxFields ? { fields: { ...fields, ...checkboxFields } } : {})
      })),
      title: params.title,
      message: params.message,
      isOrdered: params.isOrdered,
      testMode: params.testMode
    });
    let result = parseResponse(
      z.object({
        id: idSchema.optional(),
        documentId: idSchema.optional(),
        title: optionalString,
        status: optionalString,
        createdAt: optionalString,
        testMode: z.boolean().nullish()
      }),
      unwrapRecord(response.data),
      'signature request'
    );
    let id = result.id ?? result.documentId;
    if (!id) {
      throw createApiServiceError(
        'Signaturely did not return a document ID for the signature request.',
        {
          reason: 'signaturely_invalid_response'
        }
      );
    }
    return { ...result, id };
  }

  async getDocumentFile(documentId: string) {
    let response = await this.axios.get(
      `/document_sign/documents/${encodeURIComponent(documentId)}/signed_download_url/api`
    );
    return parseResponse(
      z.object({ result: z.url() }),
      unwrapRecord(response.data),
      'download'
    ).result;
  }

  async sendReminders(documentId: string, signerIds: string[]) {
    if (!signerIds.length) {
      throw createApiServiceError(
        'Provide at least one signer ID. Call get_document_signers to find signer IDs.'
      );
    }
    await this.axios.post(
      `/document_sign/documents/${encodeURIComponent(documentId)}/send_reminders`,
      {
        signersIds: signerIds
      }
    );
  }
}
