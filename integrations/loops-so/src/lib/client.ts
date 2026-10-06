import {
  AuthConfigSecretRedactor,
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getApiErrorStatus,
  getBase64ByteLength,
  isApiErrorRecord,
  pickDefined,
  requestAxiosData
} from 'slates';
import { z } from 'zod';

const nonblank = z.string().refine(value => value.trim().length > 0);
const nullableText = z.string().nullable().optional();
const contactSchema = z
  .object({
    id: nonblank,
    email: nonblank,
    firstName: nullableText,
    lastName: nullableText,
    source: nullableText,
    subscribed: z.boolean(),
    userGroup: nullableText,
    userId: nullableText,
    mailingLists: z.record(z.string(), z.boolean()).optional(),
    optInStatus: nullableText
  })
  .passthrough()
  .transform(contact => ({
    ...contact,
    firstName: contact.firstName ?? null,
    lastName: contact.lastName ?? null,
    source: contact.source ?? null,
    userGroup: contact.userGroup ?? null,
    userId: contact.userId ?? null,
    mailingLists: contact.mailingLists ?? {},
    optInStatus: contact.optInStatus ?? null
  }));
const successSchema = z.object({ success: z.literal(true) });
const contactSuccessSchema = successSchema.extend({ id: nonblank });
const transactionalSchema = z.object({
  id: nonblank,
  name: z.string(),
  dataVariables: z.array(z.string())
});
export type Contact = z.output<typeof contactSchema>;
export interface ContactData {
  email?: string;
  firstName?: string;
  lastName?: string;
  source?: string;
  subscribed?: boolean;
  userGroup?: string;
  userId?: string;
  mailingLists?: Record<string, boolean>;
  [key: string]: unknown;
}
export interface SendEventParams {
  email?: string;
  userId?: string;
  eventName: string;
  eventProperties?: Record<string, string | number | boolean>;
  mailingLists?: Record<string, boolean>;
  contactProperties?: Record<string, unknown>;
  idempotencyKey?: string;
}
export interface SendTransactionalParams {
  email: string;
  transactionalId: string;
  addToAudience?: boolean;
  dataVariables?: Record<string, string | number>;
  attachments?: Array<{ filename: string; contentType: string; content: string }>;
  idempotencyKey?: string;
}
const protectedKeys = new Set([
  'id',
  'listId',
  'softDeleteAt',
  'teamId',
  'updatedAt',
  'email',
  'userId',
  'mailingLists',
  'subscribed',
  'eventName',
  'eventProperties',
  'idempotencyKey',
  '__proto__',
  'constructor',
  'prototype'
]);
const scalarProperty = z.union([z.string(), z.number().finite(), z.boolean(), z.null()]);
export const mergeContactProperties = (
  standard: Record<string, unknown>,
  properties: Record<string, unknown> | undefined
) => {
  const body = pickDefined(standard);
  for (const [key, value] of Object.entries(properties ?? {})) {
    if (protectedKeys.has(key) || body[key] !== undefined) {
      throw createApiServiceError(
        'Contact properties must not replace reserved fields or explicitly supplied fields. Use the dedicated input fields for contact identity and subscriptions.'
      );
    }
    if (!key.trim() || !scalarProperty.safeParse(value).success) {
      throw createApiServiceError(
        'Contact properties must have nonblank names and string, finite number, boolean or null values.'
      );
    }
    body[key] = value;
  }
  return body;
};
export const loopsApiError = (error: unknown, operation: string) => {
  const preservedStatus =
    isApiErrorRecord(error) && isApiErrorRecord(error.data)
      ? error.data.upstreamStatus
      : undefined;
  const rawStatus = getApiErrorStatus(error) ?? preservedStatus;
  const numeric =
    typeof rawStatus === 'number'
      ? rawStatus
      : typeof rawStatus === 'string' && /^[1-5]\d{2}$/.test(rawStatus)
        ? Number(rawStatus)
        : undefined;
  const status =
    numeric !== undefined && Number.isInteger(numeric) && numeric >= 100 && numeric <= 599
      ? numeric
      : undefined;
  const guidance =
    status === 401
      ? 'Check the API key and team access.'
      : status === 403
        ? 'Check team access and feature availability.'
        : status === 404
          ? 'Check the contact or template identifier.'
          : status === 409
            ? 'Check for an existing contact or a reused idempotency key; do not resend automatically.'
            : status === 429
              ? 'The team rate limit was reached; wait before making another request.'
              : status === 400 || status === 422
                ? 'Check identifiers, property names, template variables and enabled features.'
                : 'Completion is unconfirmed. Check provider state before repeating a write or send.';
  return buildApiServiceError(
    { response: { status } },
    {
      providerLabel: 'Loops',
      reason: 'loops_api_error',
      operation,
      parent: {},
      extractMessage: () => guidance
    }
  );
};
const requireNonblank = (value: string, label: string) => {
  if (!value.trim()) throw createApiServiceError(`${label} must not be blank.`);
};
const validateIdentifier = (
  params: { email?: string; userId?: string },
  exclusive: boolean
) => {
  if (!params.email && !params.userId)
    throw createApiServiceError('Provide an email address or userId.');
  if (exclusive && params.email !== undefined && params.userId !== undefined)
    throw createApiServiceError('Provide exactly one of email or userId.');
  if (params.email !== undefined && !z.email().safeParse(params.email).success)
    throw createApiServiceError('Provide a valid email address.');
  if (params.userId !== undefined) requireNonblank(params.userId, 'userId');
};
const idempotencyHeaders = (key?: string) => {
  if (key === undefined) return undefined;
  if (!key.trim() || key.length > 100 || /[\r\n]/.test(key))
    throw createApiServiceError(
      'idempotencyKey must be nonblank, at most 100 characters and contain no line breaks.'
    );
  return { 'Idempotency-Key': key };
};
export class Client {
  private readonly axios: ReturnType<typeof createAuthenticatedAxios>;
  private readonly redactor: AuthConfigSecretRedactor;
  constructor(config: { token: string }) {
    if (!config.token?.trim() || /[\r\n]/.test(config.token))
      throw createApiServiceError('Provide a nonblank Loops API key without line breaks.');
    this.redactor = new AuthConfigSecretRedactor({ token: config.token });
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://app.loops.so/api/v1',
      authHeader: { value: `Bearer ${config.token}` },
      timeout: 30000,
      maxRedirects: 0
    });
  }
  private sanitize(value: unknown): unknown {
    if (typeof value === 'string')
      return this.redactor
        .redactEmbedded(value)
        .replace(/\$\$MT\$secret\$authConfig\$[A-Za-z0-9_.-]+(?:\$\$)?/g, '[redacted]');
    if (Array.isArray(value)) return value.map(entry => this.sanitize(entry));
    if (value !== null && typeof value === 'object')
      return Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [
          String(this.sanitize(key)),
          this.sanitize(entry)
        ])
      );
    return value;
  }
  private parse<T>(schema: z.ZodType<T>, value: unknown, operation: string): T {
    const parsed = schema.safeParse(this.sanitize(value));
    if (!parsed.success)
      throw createApiServiceError(
        `Loops returned an invalid response for ${operation}. Completion is unconfirmed; check provider state before repeating a write or send.`
      );
    return parsed.data;
  }
  async verifyApiKey() {
    const raw = await requestAxiosData(
      'verify team',
      () => this.axios.get('/api-key'),
      loopsApiError
    );
    return this.parse(successSchema.extend({ teamName: nonblank }), raw, 'team verification');
  }
  async createContact(data: ContactData) {
    validateIdentifier({ email: data.email }, true);
    const raw = await requestAxiosData(
      'create contact',
      () => this.axios.post('/contacts/create', pickDefined(data)),
      loopsApiError
    );
    return this.parse(contactSuccessSchema, raw, 'contact creation');
  }
  async updateContact(data: ContactData) {
    validateIdentifier(data, false);
    const raw = await requestAxiosData(
      'update contact',
      () => this.axios.put('/contacts/update', pickDefined(data)),
      loopsApiError
    );
    return this.parse(contactSuccessSchema, raw, 'contact update');
  }
  async findContact(params: { email?: string; userId?: string }) {
    validateIdentifier(params, true);
    const raw = await requestAxiosData(
      'find contact',
      () => this.axios.get('/contacts/find', { params: pickDefined(params) }),
      loopsApiError
    );
    return this.parse(z.array(contactSchema), raw, 'contact lookup');
  }
  async deleteContact(params: { email?: string; userId?: string }) {
    validateIdentifier(params, true);
    const raw = await requestAxiosData(
      'delete contact',
      () => this.axios.post('/contacts/delete', pickDefined(params)),
      loopsApiError
    );
    return this.parse(successSchema.extend({ message: z.string() }), raw, 'contact deletion');
  }
  async checkContactSuppression(params: { email?: string; userId?: string }) {
    validateIdentifier(params, true);
    const raw = await requestAxiosData(
      'check suppression',
      () => this.axios.get('/contacts/suppression', { params: pickDefined(params) }),
      loopsApiError
    );
    return this.parse(
      z.object({
        contact: z.object({ id: nonblank, email: nonblank, userId: z.string().nullable() }),
        isSuppressed: z.boolean(),
        removalQuota: z.object({
          limit: z.number().int().nonnegative(),
          remaining: z.number().int().nonnegative()
        })
      }),
      raw,
      'suppression lookup'
    );
  }
  async listContactProperties(list: 'all' | 'custom' = 'all') {
    const raw = await requestAxiosData(
      'list properties',
      () => this.axios.get('/contacts/properties', { params: { list } }),
      loopsApiError
    );
    return this.parse(
      z.array(z.object({ key: nonblank, label: z.string(), type: nonblank })),
      raw,
      'property listing'
    );
  }
  async listMailingLists() {
    const raw = await requestAxiosData(
      'list mailing lists',
      () => this.axios.get('/lists'),
      loopsApiError
    );
    return this.parse(
      z.array(
        z.object({
          id: nonblank,
          name: z.string(),
          description: z.string().nullable(),
          isPublic: z.boolean()
        })
      ),
      raw,
      'mailing list listing'
    );
  }
  async sendEvent(params: SendEventParams) {
    validateIdentifier(params, false);
    requireNonblank(params.eventName, 'eventName');
    const { contactProperties, idempotencyKey, ...standard } = params;
    const headers = idempotencyHeaders(idempotencyKey);
    const body = mergeContactProperties(standard, contactProperties);
    const raw = await requestAxiosData(
      'send event',
      () => this.axios.post('/events/send', body, { headers }),
      loopsApiError
    );
    return this.parse(successSchema, raw, 'event submission');
  }
  async sendTransactionalEmail(params: SendTransactionalParams) {
    validateIdentifier({ email: params.email }, true);
    requireNonblank(params.transactionalId, 'transactionalId');
    const { idempotencyKey, attachments, ...standard } = params;
    const headers = idempotencyHeaders(idempotencyKey);
    const body = pickDefined({
      ...standard,
      attachments: attachments?.map(file => {
        requireNonblank(file.filename, 'Attachment filename');
        requireNonblank(file.contentType, 'Attachment MIME type');
        if (
          !/^[A-Za-z0-9+/]*={0,2}$/.test(file.content) ||
          file.content.length % 4 === 1 ||
          Buffer.from(file.content, 'base64').toString('base64').replace(/=+$/, '') !==
            file.content.replace(/=+$/, '')
        )
          throw createApiServiceError('Attachment content must be valid base64.');
        if (getBase64ByteLength(file.content) >= 3000000)
          throw createApiServiceError(
            'The complete email request must be smaller than 4 MB, including encoded attachments.'
          );
        return { filename: file.filename, contentType: file.contentType, data: file.content };
      })
    });
    if (Buffer.byteLength(JSON.stringify(body), 'utf8') >= 4000000)
      throw createApiServiceError(
        'The complete email request must be smaller than 4 MB, including encoded attachments.'
      );
    const raw = await requestAxiosData(
      'send transactional email',
      () => this.axios.post('/transactional', body, { headers }),
      loopsApiError
    );
    return this.parse(successSchema, raw, 'transactional send');
  }
  async listTransactionalEmails(params?: { perPage?: number; cursor?: string }) {
    if (
      params?.perPage !== undefined &&
      (!Number.isInteger(params.perPage) || params.perPage < 10 || params.perPage > 50)
    )
      throw createApiServiceError('perPage must be an integer from 10 to 50.');
    if (params?.cursor !== undefined) requireNonblank(params.cursor, 'cursor');
    const raw = await requestAxiosData(
      'list published templates',
      () =>
        this.axios.get('/transactional', { params: params ? pickDefined(params) : undefined }),
      loopsApiError
    );
    const parsed = this.parse(
      z.object({
        pagination: z.object({ nextCursor: nonblank.nullable() }),
        data: z.array(transactionalSchema)
      }),
      raw,
      'published template listing'
    );
    return {
      pagination: {
        hasMore: parsed.pagination.nextCursor !== null,
        cursor: parsed.pagination.nextCursor
      },
      emails: parsed.data
    };
  }
}
