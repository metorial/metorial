import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined,
  pushBoundedApiErrorDetail
} from 'slates';
import { z } from 'zod';

let idSchema = z.number().int().positive();
let timestampSchema = z.string().min(1);
let optionalText = z.string().nullable().optional();
let publicationSchema = z
  .object({ id: idSchema, name: z.string(), key: z.string() })
  .passthrough();
let issueSummarySchema = z
  .object({
    id: idSchema.optional(),
    number: z.number(),
    title: z.string(),
    summary: z.string(),
    url: z.string(),
    published_at: timestampSchema.nullable(),
    updated_at: timestampSchema,
    open_rate: z.number().nullable().optional(),
    click_rate: z.number().nullable().optional()
  })
  .passthrough();
let embeddedLinkSchema = z
  .object({
    identifier: optionalText,
    title: optionalText,
    url: optionalText,
    url_domain: optionalText
  })
  .passthrough();
let issueItemSchema = z
  .object({
    type: z.string().min(1),
    title: optionalText,
    description: optionalText,
    url: optionalText,
    image_url: optionalText,
    footer: optionalText,
    url_domain: optionalText,
    embedded_links: z.array(embeddedLinkSchema).nullable().optional()
  })
  .passthrough();
let issueCategorySchema = z
  .object({
    name: z.string(),
    code: optionalText,
    items: z.array(issueItemSchema).nullable().optional()
  })
  .passthrough();
let issueDetailSchema = issueSummarySchema.extend({
  id: idSchema,
  categories: z.array(issueCategorySchema).nullable().optional()
});
let linkSchema = z
  .object({
    id: idSchema,
    url: z.string(),
    title: z.string(),
    description: z.string(),
    image_url: optionalText,
    category: optionalText,
    issue_id: idSchema.nullable().optional(),
    created_at: timestampSchema.nullable().optional(),
    updated_at: timestampSchema.nullable().optional()
  })
  .passthrough();
let subscriberSchema = z
  .object({
    id: idSchema,
    email: z.string(),
    created_at: timestampSchema.nullable().optional()
  })
  .passthrough();
let pageSchema = z.number().int().nonnegative();
let issueListSchema = z
  .object({
    page: pageSchema,
    total_pages: pageSchema,
    total_results: pageSchema,
    issues: z.array(issueSummarySchema).optional(),
    data: z.array(issueSummarySchema).optional()
  })
  .passthrough()
  .refine(value => value.issues !== undefined || value.data !== undefined, {
    message: 'Expected an issues or data array'
  });
let subscriberListSchema = z
  .object({
    page: pageSchema.nullable().optional(),
    total_pages: pageSchema.nullable().optional(),
    total_results: pageSchema.nullable().optional(),
    subscribers: z.array(subscriberSchema).optional(),
    data: z.array(subscriberSchema).optional()
  })
  .passthrough()
  .refine(value => value.subscribers !== undefined || value.data !== undefined, {
    message: 'Expected a subscribers or data array'
  });
let unsubscriberListSchema = z
  .object({
    page: pageSchema.nullable().optional(),
    total_pages: pageSchema.nullable().optional(),
    total_results: pageSchema.nullable().optional(),
    unsubscribers: z.array(subscriberSchema).optional(),
    data: z.array(subscriberSchema).optional()
  })
  .passthrough()
  .refine(value => value.unsubscribers !== undefined || value.data !== undefined, {
    message: 'Expected an unsubscribers or data array'
  });
let subscribeSchema = z
  .object({
    success: z.boolean(),
    error_message: optionalText,
    errors: z.array(z.string()).nullable().optional()
  })
  .passthrough();
let categorySchema = z
  .object({
    code: z.string(),
    name: z.string(),
    sponsored: z.boolean(),
    limit: z.number().nullable()
  })
  .passthrough();

let apiError = (error: unknown, operation: string) =>
  buildApiServiceError(error, {
    providerLabel: 'Curated',
    reason: 'curated_api_error',
    operation,
    detailKeys: ['message', 'detail', 'error', 'error_description', 'error_message', 'code'],
    nestedKeys: ['errors', 'error'],
    extractResponse: (error, helpers) => helpers.getResponseWithBody(error),
    extractUpstreamCode: (_error, response) => {
      if (!isApiErrorRecord(response?.data)) return undefined;
      let body = response.data;
      let code = body.code ?? (isApiErrorRecord(body.error) ? body.error.code : undefined);
      return typeof code === 'string' || typeof code === 'number' ? String(code) : undefined;
    },
    extractMessage: (error, helpers) => {
      let body = helpers.getResponseWithBody(error)?.data;
      let details: string[] = [];
      helpers.collectDetails(body, details, {
        detailKeys: [
          'message',
          'detail',
          'error',
          'error_description',
          'error_message',
          'code'
        ],
        nestedKeys: ['errors', 'error']
      });
      if (isApiErrorRecord(body) && isApiErrorRecord(body.errors)) {
        for (let [field, value] of Object.entries(body.errors)) {
          let reasons: string[] = [];
          helpers.collectDetails(value, reasons);
          details.push(...reasons.map(reason => `${field}: ${reason}`));
        }
      }
      let boundedDetails: string[] = [];
      for (let detail of details) pushBoundedApiErrorDetail(boundedDetails, detail);
      return boundedDetails.length ? boundedDetails.join(' - ').slice(0, 1000) : undefined;
    }
  });

export let validateToken = (token: string) => {
  if (!token.trim() || /["\\\r\n]/.test(token)) {
    throw createApiServiceError('Enter a valid Curated Account API Key.', {
      reason: 'invalid_api_key'
    });
  }
  return token;
};

let pathId = (value: string, label: string) => {
  if (!/^[0-9]+$/.test(value) || !/[1-9]/.test(value)) {
    throw createApiServiceError(`${label} must be a positive numeric ID.`, {
      reason: 'invalid_resource_id'
    });
  }
  return encodeURIComponent(value);
};
let publicationPath = (id: string) => `/publications/${pathId(id, 'Publication ID')}`;
let pagination = (params: { page?: number; perPage?: number } | undefined, max: number) => {
  for (let [key, value] of Object.entries(params ?? {})) {
    if (
      (key === 'page' || key === 'perPage') &&
      value !== undefined &&
      (!Number.isSafeInteger(value) ||
        Number(value) < 1 ||
        (key === 'perPage' && Number(value) > max))
    ) {
      throw createApiServiceError(
        `${key} must be a positive integer${key === 'perPage' ? ` no greater than ${max}` : ''}.`,
        {
          reason: 'invalid_pagination'
        }
      );
    }
  }
  return pickDefined({ page: params?.page, per_page: params?.perPage });
};
let validateUrl = (value: string, label: string) => {
  let parsed = z.url({ protocol: /^https?$/ }).safeParse(value);
  if (!parsed.success) {
    throw createApiServiceError(`${label} must be an absolute HTTP or HTTPS URL.`, {
      reason: 'invalid_url'
    });
  }
};
let validateEmail = (email: string) => {
  if (!z.email().safeParse(email).success) {
    throw createApiServiceError('Enter a valid email address.', { reason: 'invalid_email' });
  }
};

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.curated.co/api/v3',
      timeout: 30000,
      maxRedirects: 0,
      headers: { Accept: 'application/json' },
      authHeader: { value: `Token token="${validateToken(config.token)}"` }
    });
  }

  private async request<S extends z.ZodType>(
    schema: S,
    operation: string,
    request: () => Promise<{ data: unknown; status?: number }>
  ): Promise<z.output<S>> {
    try {
      let response = await request();
      let { data } = response;
      if (
        isApiErrorRecord(data) &&
        (data.success === false ||
          (data.success !== true &&
            ((typeof data.error_message === 'string' && data.error_message.length > 0) ||
              (typeof data.error === 'string' && data.error.length > 0) ||
              isApiErrorRecord(data.error) ||
              (Array.isArray(data.errors) && data.errors.length > 0) ||
              (isApiErrorRecord(data.errors) && Object.keys(data.errors).length > 0))))
      ) {
        throw apiError({ response: { data, status: response.status } }, operation);
      }
      let parsed = schema.safeParse(data);
      if (!parsed.success) {
        let fields = parsed.error.issues
          .map(issue => issue.path.join('.') || 'response')
          .slice(0, 5)
          .join(', ');
        throw createApiServiceError(
          `Curated returned an invalid ${operation} response (${fields}).`,
          {
            reason: 'invalid_api_response'
          }
        );
      }
      return parsed.data;
    } catch (error) {
      throw apiError(error, operation);
    }
  }

  async listPublications() {
    return this.request(z.array(publicationSchema), 'list publications', () =>
      this.axios.get('/publications')
    );
  }

  async listIssues(
    publicationId: string,
    params?: {
      page?: number;
      perPage?: number;
      state?: 'published' | 'draft';
      stats?: boolean;
    }
  ) {
    return this.request(issueListSchema, 'list issues', () =>
      this.axios.get(`${publicationPath(publicationId)}/issues`, {
        params: {
          ...pagination(params, 250),
          ...pickDefined({ state: params?.state, stats: params?.stats })
        }
      })
    );
  }

  async getIssue(publicationId: string, issueNumber: string, params?: { stats?: boolean }) {
    return this.request(issueDetailSchema, 'get issue', () =>
      this.axios.get(
        `${publicationPath(publicationId)}/issues/${pathId(issueNumber, 'Issue number or ID')}`,
        {
          params: pickDefined({ stats: params?.stats })
        }
      )
    );
  }

  async createDraftIssue(publicationId: string) {
    return this.request(
      issueSummarySchema.omit({ published_at: true }).extend({ id: idSchema }),
      'create draft issue',
      () => this.axios.post(`${publicationPath(publicationId)}/issues/`)
    );
  }

  async deleteDraftIssue(publicationId: string, issueId: string) {
    await this.request(z.unknown(), 'delete draft issue', () =>
      this.axios.delete(
        `${publicationPath(publicationId)}/issues/${pathId(issueId, 'Draft issue ID')}`
      )
    );
  }

  async listLinks(publicationId: string) {
    return this.request(z.array(linkSchema), 'list links', () =>
      this.axios.get(`${publicationPath(publicationId)}/links`)
    );
  }

  async getLink(publicationId: string, linkId: string) {
    return this.request(linkSchema, 'get link', () =>
      this.axios.get(`${publicationPath(publicationId)}/links/${pathId(linkId, 'Link ID')}`)
    );
  }

  async createLink(
    publicationId: string,
    params: {
      url: string;
      title?: string;
      description?: string;
      image?: string;
      category?: string;
    }
  ) {
    validateUrl(params.url, 'Link URL');
    if (params.image !== undefined) validateUrl(params.image, 'Image URL');
    return this.request(linkSchema, 'create link', () =>
      this.axios.post(`${publicationPath(publicationId)}/links`, null, {
        params: pickDefined(params)
      })
    );
  }

  async updateLink(
    publicationId: string,
    linkId: string,
    params: {
      url?: string;
      title?: string;
      description?: string;
      category?: string;
      issueId?: string;
    }
  ) {
    if (Object.values(params).every(value => value === undefined)) {
      throw createApiServiceError('Provide at least one link property to update.', {
        reason: 'empty_update'
      });
    }
    if (params.url !== undefined) validateUrl(params.url, 'Link URL');
    if (params.issueId !== undefined && params.issueId !== '')
      pathId(params.issueId, 'Draft issue ID');
    return this.request(linkSchema, 'update link', () =>
      this.axios.put(
        `${publicationPath(publicationId)}/links/${pathId(linkId, 'Link ID')}`,
        null,
        {
          params: pickDefined({
            url: params.url,
            title: params.title,
            description: params.description,
            category: params.category,
            issue_id: params.issueId
          })
        }
      )
    );
  }

  async deleteLink(publicationId: string, linkId: string) {
    await this.request(z.unknown(), 'delete link', () =>
      this.axios.delete(`${publicationPath(publicationId)}/links/${pathId(linkId, 'Link ID')}`)
    );
  }

  async listSubscribers(publicationId: string, params?: { page?: number; perPage?: number }) {
    return this.request(subscriberListSchema, 'list subscribers', () =>
      this.axios.get(`${publicationPath(publicationId)}/email_subscribers`, {
        params: pagination(params, 500)
      })
    );
  }

  async getSubscriber(publicationId: string, subscriberId: string) {
    return this.request(subscriberSchema, 'get subscriber', () =>
      this.axios.get(
        `${publicationPath(publicationId)}/email_subscribers/${pathId(subscriberId, 'Subscriber ID')}`
      )
    );
  }

  async subscribe(publicationId: string, params: { email: string; sync?: boolean }) {
    validateEmail(params.email);
    return this.request(subscribeSchema, 'subscribe email', () =>
      this.axios.post(
        `${publicationPath(publicationId)}/email_subscribers`,
        pickDefined(params)
      )
    );
  }

  async listUnsubscribers(
    publicationId: string,
    params?: { page?: number; perPage?: number }
  ) {
    return this.request(unsubscriberListSchema, 'list unsubscribers', () =>
      this.axios.get(`${publicationPath(publicationId)}/email_unsubscribers`, {
        params: pagination(params, 500)
      })
    );
  }

  async unsubscribe(publicationId: string, params: { email: string }) {
    validateEmail(params.email);
    return this.request(subscribeSchema, 'unsubscribe email', () =>
      this.axios.post(`${publicationPath(publicationId)}/email_unsubscribers`, params)
    );
  }

  async listCategories(publicationId: string) {
    return this.request(z.array(categorySchema), 'list categories', () =>
      this.axios.get(`${publicationPath(publicationId)}/categories`)
    );
  }
}
