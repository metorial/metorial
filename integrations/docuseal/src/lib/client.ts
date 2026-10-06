import { isDeepStrictEqual } from 'node:util';
import { createAxios, getBase64ByteLength, pickDefined } from 'slates';
import { z } from 'zod';
import {
  documentSchema,
  paginationSchema,
  receiptSchema,
  submissionSchema,
  submitterSchema,
  templateSchema,
  templateSummarySchema
} from './schemas';
import { apiError, fail, id, parse, privacy, type Row, text } from './validation';

export interface ClientConfig {
  token: string;
  baseUrl: string;
}

export interface PaginationParams {
  limit?: number;
  after?: number;
  before?: number;
}

// Template types
export interface TemplateDocument {
  name: string;
  file: string;
  fields?: Record<string, unknown>[];
}

export interface CreateTemplatePdfParams {
  name: string;
  documents: TemplateDocument[];
  folderName?: string;
  externalId?: string;
  sharedLink?: boolean;
  flatten?: boolean;
  removeTags?: boolean;
}

export interface CreateTemplateDocxParams {
  name: string;
  documents: TemplateDocument[];
  folderName?: string;
  externalId?: string;
  sharedLink?: boolean;
}

export interface CreateTemplateHtmlParams {
  html: string;
  htmlHeader?: string;
  htmlFooter?: string;
  name?: string;
  size?: string;
  externalId?: string;
  folderName?: string;
  sharedLink?: boolean;
  documents?: Array<{ html: string; name?: string }>;
}

export interface UpdateTemplateParams {
  name?: string;
  folderName?: string;
  externalId?: string;
  roles?: string[];
  archived?: boolean;
}

export interface CloneTemplateParams {
  name?: string;
  folderName?: string;
  externalId?: string;
}

export interface MergeTemplatesParams {
  templateIds: number[];
  name?: string;
  folderName?: string;
  externalId?: string;
  sharedLink?: boolean;
}

export interface ListTemplatesParams extends PaginationParams {
  q?: string;
  slug?: string;
  externalId?: string;
  folder?: string;
  archived?: boolean;
}

// Submission types
export interface SubmissionSubmitter {
  role?: string;
  email: string;
  name?: string;
  phone?: string;
  values?: Record<string, unknown>;
  externalId?: string;
  completed?: boolean;
  metadata?: Record<string, unknown>;
  sendEmail?: boolean;
  sendSms?: boolean;
  replyTo?: string;
  completedRedirectUrl?: string;
  requirePhone2fa?: boolean;
  requireEmail2fa?: boolean;
  message?: { subject?: string; body?: string };
  fields?: Record<string, unknown>[];
}

export interface CreateSubmissionParams {
  templateId: number;
  submitters: SubmissionSubmitter[];
  sendEmail?: boolean;
  sendSms?: boolean;
  order?: string;
  completedRedirectUrl?: string;
  bccCompleted?: string;
  replyTo?: string;
  expireAt?: string;
  variables?: Record<string, unknown>;
  message?: { subject?: string; body?: string };
}

export interface CreateSubmissionFromPdfParams {
  name?: string;
  documents: Array<{ name: string; file: string; fields?: Record<string, unknown>[] }>;
  submitters: SubmissionSubmitter[];
  sendEmail?: boolean;
  order?: string;
  fields?: Record<string, unknown>[];
  message?: { subject?: string; body?: string };
  flatten?: boolean;
  mergeDocuments?: boolean;
  removeTags?: boolean;
}

export interface CreateSubmissionFromHtmlParams {
  documents: Array<{ html: string; name?: string }>;
  submitters: SubmissionSubmitter[];
  name?: string;
  sendEmail?: boolean;
  order?: string;
  fields?: Record<string, unknown>[];
  mergeDocuments?: boolean;
}

export interface ListSubmissionsParams extends PaginationParams {
  templateId?: number;
  status?: string;
  q?: string;
  slug?: string;
  templateFolder?: string;
  archived?: boolean;
}

// Submitter types
export interface ListSubmittersParams extends PaginationParams {
  submissionId?: number;
  q?: string;
  slug?: string;
  completedAfter?: string;
  completedBefore?: string;
  externalId?: string;
}

export interface UpdateSubmitterParams {
  name?: string;
  email?: string;
  phone?: string;
  values?: Record<string, unknown>;
  externalId?: string;
  sendEmail?: boolean;
  sendSms?: boolean;
  replyTo?: string;
  completed?: boolean;
  metadata?: Record<string, unknown>;
  completedRedirectUrl?: string;
  requirePhone2fa?: boolean;
  requireEmail2fa?: boolean;
  message?: { subject?: string; body?: string };
  fields?: Record<string, unknown>[];
}

const aliases: Record<string, string> = {
  templateId: 'template_id',
  templateIds: 'template_ids',
  submissionId: 'submission_id',
  externalId: 'external_id',
  folderName: 'folder_name',
  sharedLink: 'shared_link',
  removeTags: 'remove_tags',
  htmlHeader: 'html_header',
  htmlFooter: 'html_footer',
  sendEmail: 'send_email',
  sendSms: 'send_sms',
  completedRedirectUrl: 'completed_redirect_url',
  bccCompleted: 'bcc_completed',
  replyTo: 'reply_to',
  expireAt: 'expire_at',
  requirePhone2fa: 'require_phone_2fa',
  requireEmail2fa: 'require_email_2fa',
  mergeDocuments: 'merge_documents',
  templateFolder: 'template_folder',
  completedAfter: 'completed_after',
  completedBefore: 'completed_before',
  attachmentUuid: 'attachment_uuid',
  submitterUuid: 'submitter_uuid',
  defaultValue: 'default_value'
};
function body(value: Row): Row {
  return Object.fromEntries(
    Object.entries(pickDefined(value)).map(([key, item]) => {
      const native = aliases[key] ?? key;
      if (['values', 'metadata', 'variables', 'preferences'].includes(native))
        return [native, item];
      if (Array.isArray(item))
        return [
          native,
          item.map(child =>
            child && typeof child === 'object' && !Array.isArray(child)
              ? body(child as Row)
              : child
          )
        ];
      if (item && typeof item === 'object') return [native, body(item as Row)];
      return [native, item];
    })
  );
}
function paging(params: PaginationParams) {
  if (
    params.limit !== undefined &&
    (!Number.isInteger(params.limit) || params.limit < 1 || params.limit > 100)
  )
    fail('limit must be an integer from 1 to 100.');
  for (const value of [params.after, params.before])
    if (value !== undefined) id(value, 'Pagination ID');
}
function date(value: string, label: string) {
  text(value, label);
  const parts = /^(\d{4})-(\d{2})-(\d{2})(?:T| )(\d{2}):(\d{2})(?::(\d{2}))?/.exec(value);
  if (
    !parts ||
    Number(parts[2]) < 1 ||
    Number(parts[2]) > 12 ||
    Number(parts[3]) < 1 ||
    Number(parts[3]) >
      new Date(Date.UTC(Number(parts[1]), Number(parts[2]), 0)).getUTCDate() ||
    Number(parts[4]) > 23 ||
    Number(parts[5]) > 59 ||
    Number(parts[6] ?? 0) > 59
  )
    fail(`${label} contains an invalid calendar date or time.`);
  if (
    !/^\d{4}-\d{2}-\d{2}(?:T| )\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2}| UTC)$/.test(
      value
    ) ||
    !Number.isFinite(Date.parse(value.replace(' UTC', 'Z').replace(' ', 'T')))
  )
    fail(`${label} must be an unambiguous date-time with UTC or a numeric offset.`);
}
function source(file: string) {
  text(file, 'Document file');
  if (/^https?:\/\//i.test(file)) {
    try {
      const url = new URL(file);
      if (url.username || url.password || url.hash)
        fail('Document source URLs must not contain credentials or fragments.');
    } catch {
      fail('Document file must be a valid HTTP(S) URL or base64 content.');
    }
    return;
  }
  const encoded = file.replace(/^data:[a-z0-9.+/-]+;base64,/i, '').replace(/\s/g, '');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded) || encoded.length % 4 === 1)
    fail('Document file must be valid base64 content or a downloadable HTTP(S) URL.');
  const bytes = getBase64ByteLength(encoded);
  if (!bytes || bytes > 64 * 1024 * 1024)
    fail(
      'Document file must be valid non-empty base64 content up to 64 MiB or a downloadable URL.'
    );
}
function documents(value: TemplateDocument[]) {
  if (!value.length) fail('Provide at least one document.');
  for (const doc of value) {
    text(doc.name, 'Document name');
    source(doc.file);
  }
}
function signers(
  value: SubmissionSubmitter[],
  defaults: { sendEmail?: boolean; sendSms?: boolean } = {}
) {
  if (!value.length) fail('Provide at least one submitter.');
  for (const signer of value) {
    if (!signer.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signer.email))
      fail('Every submitter needs a valid email address.');
    if (signer.phone !== undefined && !/^\+[1-9]\d{1,14}$/.test(signer.phone))
      fail('Phone numbers must use E.164 format.');
    if ((signer.sendSms ?? defaults.sendSms) || signer.requirePhone2fa) {
      if (!signer.phone) fail('SMS sending or phone 2FA requires a phone number.');
    }
    for (const v of [signer.role, signer.name, signer.externalId])
      if (v !== undefined) text(v, 'Submitter option');
  }
}
function normalizedEmail(value: string) {
  return value.trim().toLowerCase();
}
function matchesSigners(
  actual: z.infer<typeof submitterSchema>[],
  expected: SubmissionSubmitter[]
) {
  if (new Set(actual.map(signer => signer.id)).size !== actual.length) return false;
  const remaining = [...actual];
  return (
    expected.every(signer => {
      const index = remaining.findIndex(
        item =>
          typeof item.email === 'string' &&
          normalizedEmail(item.email) === normalizedEmail(signer.email) &&
          (signer.role === undefined || item.role === signer.role) &&
          (signer.externalId === undefined || item.external_id === signer.externalId)
      );
      if (index < 0) return false;
      remaining.splice(index, 1);
      return true;
    }) && remaining.length === 0
  );
}
export class Client {
  private readonly api: ReturnType<typeof createAxios>;
  constructor(private readonly config: ClientConfig) {
    text(config.token, 'API key');
    if (!['https://api.docuseal.com', 'https://api.docuseal.eu'].includes(config.baseUrl))
      fail('Choose the documented US or EU cloud API URL.');
    this.api = createAxios({
      baseURL: config.baseUrl,
      timeout: 30000,
      maxRedirects: 0,
      maxContentLength: 16 * 1024 * 1024,
      maxBodyLength: 96 * 1024 * 1024,
      headers: {
        'X-Auth-Token': config.token,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });
  }
  private async request(
    method: 'get' | 'post' | 'put' | 'delete',
    path: string,
    data?: object,
    params?: object
  ): Promise<unknown> {
    let response: { status: number; data: unknown };
    try {
      response = await this.api.request({
        method,
        url: path,
        data: data ? body(data as Row) : undefined,
        params: params ? body(params as Row) : undefined
      });
    } catch (error) {
      apiError(error);
    }
    if (response.status < 200 || response.status >= 300 || response.status === 202)
      fail(
        'DocuSeal did not confirm completion. Read current state before retrying; sending, signing or another write may already have completed.',
        'docuseal_unconfirmed_response'
      );
    return privacy(response.data, this.config.token);
  }
  private async list<T>(path: string, params: PaginationParams, schema: z.ZodType<T>) {
    paging(params);
    return parse(
      z.object({ data: z.array(schema), pagination: paginationSchema }),
      await this.request('get', path, undefined, params)
    );
  }
  async listTemplates(params: ListTemplatesParams = {}) {
    return this.list('/templates', params, templateSummarySchema);
  }
  async listSubmissions(params: ListSubmissionsParams = {}) {
    if (params.templateId !== undefined) id(params.templateId, 'Template ID');
    return this.list('/submissions', params, submissionSchema);
  }
  async listSubmitters(params: ListSubmittersParams = {}) {
    if (params.submissionId !== undefined) id(params.submissionId, 'Submission ID');
    for (const value of [params.completedAfter, params.completedBefore])
      if (value !== undefined) date(value, 'Completion filter');
    return this.list('/submitters', params, submitterSchema);
  }
  async getTemplate(templateId: number) {
    const result = parse(
      templateSchema,
      await this.request('get', `/templates/${id(templateId)}`)
    );
    if (result.id !== templateId)
      fail('DocuSeal returned another template.', 'docuseal_invalid_identity');
    return result;
  }
  async getSubmission(submissionId: number) {
    const result = parse(
      submissionSchema,
      await this.request('get', `/submissions/${id(submissionId)}`)
    );
    if (
      result.id !== submissionId ||
      result.submitters.some(
        sub => sub.submission_id !== undefined && sub.submission_id !== submissionId
      )
    )
      fail(
        'DocuSeal returned another submission or submitter relationship.',
        'docuseal_invalid_identity'
      );
    return result;
  }
  async getSubmitter(submitterId: number) {
    const result = parse(
      submitterSchema,
      await this.request('get', `/submitters/${id(submitterId)}`)
    );
    if (result.id !== submitterId)
      fail('DocuSeal returned another submitter.', 'docuseal_invalid_identity');
    return result;
  }
  private async newTemplate(path: string, params: object, sourceIds: number[] = []) {
    const receipt = parse(receiptSchema, await this.request('post', path, params));
    if (sourceIds.includes(receipt.id))
      fail(
        'DocuSeal returned a source template instead of a new template. Creation may have completed; inspect current state before retrying.',
        'docuseal_unconfirmed_mutation'
      );
    const current = await this.getTemplate(receipt.id);
    const requested = params as Row;
    if (
      (requested.name !== undefined && current.name !== requested.name) ||
      (requested.externalId !== undefined && current.external_id !== requested.externalId) ||
      (requested.folderName !== undefined && current.folder_name !== requested.folderName)
    )
      fail(
        'Template creation returned unexpected state. Creation may have completed; inspect the exact ID before retrying.',
        'docuseal_unconfirmed_mutation'
      );
    return current;
  }
  async createTemplatePdf(params: CreateTemplatePdfParams) {
    text(params.name, 'Template name');
    documents(params.documents);
    return this.newTemplate('/templates/pdf', params);
  }
  async createTemplateDocx(params: CreateTemplateDocxParams) {
    text(params.name, 'Template name');
    documents(params.documents);
    return this.newTemplate('/templates/docx', params);
  }
  async createTemplateHtml(params: CreateTemplateHtmlParams) {
    if (params.documents?.length) {
      if (params.html) fail('Choose documents or top-level html, rather than both.');
      params.documents.forEach(doc => text(doc.html, 'HTML document'));
    } else text(params.html, 'HTML');
    return this.newTemplate('/templates/html', params);
  }
  async cloneTemplate(templateId: number, params: CloneTemplateParams = {}) {
    id(templateId);
    return this.newTemplate(`/templates/${templateId}/clone`, params, [templateId]);
  }
  async mergeTemplates(params: MergeTemplatesParams) {
    if (
      params.templateIds.length < 2 ||
      new Set(params.templateIds).size !== params.templateIds.length
    )
      fail('Provide at least two distinct template IDs.');
    params.templateIds.forEach(value => id(value));
    return this.newTemplate('/templates/merge', params, params.templateIds);
  }
  async updateTemplate(templateId: number, params: UpdateTemplateParams) {
    id(templateId);
    const before = params.roles !== undefined ? await this.getTemplate(templateId) : undefined;
    const expectedRoles = before?.submitters.map(role => role.name);
    if (params.roles?.length) {
      params.roles.forEach(role => text(role, 'Role name'));
      params.roles.forEach((role, index) => {
        if (expectedRoles) expectedRoles[index] = role;
      });
    }
    if (params.name !== undefined) text(params.name, 'Template name');
    if (params.externalId !== undefined) text(params.externalId, 'External ID');
    if (!Object.keys(pickDefined(params)).length)
      fail('Provide a template property to update.');
    const receipt = parse(
      receiptSchema,
      await this.request('put', `/templates/${templateId}`, params)
    );
    if (receipt.id !== templateId)
      fail(
        'DocuSeal returned another template update receipt.',
        'docuseal_unconfirmed_mutation'
      );
    const current = await this.getTemplate(templateId);
    if (
      (params.name !== undefined && current.name !== params.name) ||
      (params.folderName !== undefined && current.folder_name !== params.folderName) ||
      (params.externalId !== undefined && current.external_id !== params.externalId) ||
      (params.roles !== undefined &&
        JSON.stringify(current.submitters.map(sub => sub.name)) !==
          JSON.stringify(expectedRoles)) ||
      (params.archived !== undefined &&
        (params.archived ? !current.archived_at : current.archived_at !== null))
    )
      fail(
        'DocuSeal did not confirm the requested template state. Read current state before retrying.',
        'docuseal_unconfirmed_mutation'
      );
    return current;
  }
  async archiveTemplate(templateId: number) {
    return this.archive('templates', templateId);
  }
  async archiveSubmission(submissionId: number) {
    return this.archive('submissions', submissionId);
  }
  private async archive(kind: 'templates' | 'submissions', value: number) {
    const receipt = parse(
      receiptSchema,
      await this.request('delete', `/${kind}/${id(value)}`)
    );
    if (
      receipt.id !== value ||
      typeof receipt.archived_at !== 'string' ||
      !receipt.archived_at
    )
      fail(
        'DocuSeal did not confirm archival of this exact resource. Read archived state before retrying.',
        'docuseal_unconfirmed_mutation'
      );
    return { id: receipt.id, archived_at: receipt.archived_at };
  }
  async getSubmissionDocuments(submissionId: number, merge?: boolean) {
    const result = parse(
      z.object({ id: z.number().int().positive().safe(), documents: z.array(documentSchema) }),
      await this.request('get', `/submissions/${id(submissionId)}/documents`, undefined, {
        merge
      })
    );
    if (result.id !== submissionId)
      fail('DocuSeal returned documents for another submission.', 'docuseal_invalid_identity');
    return result;
  }
  async createSubmission(params: CreateSubmissionParams) {
    id(params.templateId);
    signers(params.submitters, params);
    if (params.expireAt !== undefined) date(params.expireAt, 'Expiration');
    const template = await this.getTemplate(params.templateId);
    if (
      params.submitters.some(
        sub =>
          sub.role !== undefined && !template.submitters.some(role => role.name === sub.role)
      )
    )
      fail(
        'A submitter role does not belong to this template. Use get_template to discover its roles.'
      );
    const result = parse(
      z.array(submitterSchema.extend({ email: z.string() })).min(1),
      await this.request('post', '/submissions', params)
    );
    if (
      result.length !== params.submitters.length ||
      new Set(result.map(s => s.id)).size !== result.length ||
      !matchesSigners(result, params.submitters) ||
      result.some(s => s.submission_id === undefined) ||
      new Set(result.map(s => s.submission_id)).size !== 1
    )
      fail(
        'DocuSeal did not return an exact submitter receipt. Sending or signing may have completed; inspect submissions before retrying.',
        'docuseal_unconfirmed_mutation'
      );
    const current = await this.getSubmission(id(result[0]?.submission_id ?? 0));
    const templateIds = [current.template_id, current.template?.id].filter(
      value => value !== undefined
    );
    if (
      !templateIds.length ||
      templateIds.some(value => value !== params.templateId) ||
      !matchesSigners(current.submitters, params.submitters) ||
      !isDeepStrictEqual(
        current.submitters.map(signer => signer.id).sort((a, b) => a - b),
        result.map(signer => signer.id).sort((a, b) => a - b)
      )
    )
      fail(
        'DocuSeal did not confirm this submission belongs to the requested template and submitters. Sending or signing may have completed; inspect current state before retrying.',
        'docuseal_unconfirmed_mutation'
      );
    return result;
  }
  async createSubmissionFromPdf(params: CreateSubmissionFromPdfParams) {
    documents(params.documents);
    signers(params.submitters, params);
    const result = parse(
      submissionSchema.extend({
        submitters: z.array(submitterSchema.extend({ email: z.string() }))
      }),
      await this.request('post', '/submissions/pdf', params)
    );
    if (
      result.submitters.length !== params.submitters.length ||
      !matchesSigners(result.submitters, params.submitters) ||
      result.submitters.some(sub => sub.submission_id !== result.id)
    )
      fail(
        'DocuSeal returned unexpected submission relationships. Inspect current submissions before retrying.',
        'docuseal_unconfirmed_mutation'
      );
    return result;
  }
  async updateSubmission(
    submissionId: number,
    params: { name?: string; expireAt?: string | null; archived?: boolean }
  ) {
    id(submissionId);
    if (!Object.keys(pickDefined(params)).length) fail('Provide name, expireAt or archived.');
    if (params.name !== undefined) text(params.name, 'Submission name');
    if (typeof params.expireAt === 'string') date(params.expireAt, 'Expiration');
    const receipt = parse(
      receiptSchema,
      await this.request('put', `/submissions/${submissionId}`, params)
    );
    if (receipt.id !== submissionId)
      fail('DocuSeal returned another submission receipt.', 'docuseal_unconfirmed_mutation');
    const current = await this.getSubmission(submissionId);
    if (
      (params.name !== undefined && current.name !== params.name) ||
      (params.expireAt !== undefined &&
        (params.expireAt === null
          ? current.expire_at !== null
          : typeof current.expire_at !== 'string' ||
            Date.parse(current.expire_at) !==
              Date.parse(params.expireAt.replace(' UTC', 'Z').replace(' ', 'T')))) ||
      (params.archived !== undefined &&
        (params.archived ? !current.archived_at : current.archived_at !== null))
    )
      fail(
        'DocuSeal did not confirm the requested submission state. Read current state before retrying.',
        'docuseal_unconfirmed_mutation'
      );
    return current;
  }
  async updateSubmitter(submitterId: number, params: UpdateSubmitterParams) {
    id(submitterId);
    if (!Object.keys(pickDefined(params)).length)
      fail('Provide a submitter property to update.');
    if (params.email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(params.email))
      fail('Provide a valid email address.');
    if (params.phone !== undefined && !/^\+[1-9]\d{1,14}$/.test(params.phone))
      fail('Phone must use E.164 format.');
    const before = await this.getSubmitter(submitterId);
    if (
      before.completed_at ||
      before.status === 'completed' ||
      before.declined_at ||
      before.status === 'declined'
    )
      fail(
        'Completed or declined submitters cannot be updated. A signature cannot be undone; create a new submission if needed.'
      );
    if ((params.sendSms || params.requirePhone2fa) && !(params.phone ?? before.phone))
      fail('SMS sending or phone 2FA requires a phone number.');
    const receipt = parse(
      submitterSchema,
      await this.request('put', `/submitters/${submitterId}`, params)
    );
    if (receipt.id !== submitterId)
      fail('DocuSeal returned another submitter receipt.', 'docuseal_unconfirmed_mutation');
    const current = await this.getSubmitter(submitterId);
    if (
      current.submission_id !== before.submission_id ||
      ['name', 'email', 'phone'].some(
        key =>
          params[key as keyof UpdateSubmitterParams] !== undefined &&
          (key === 'email'
            ? normalizedEmail(String(params.email)) !== normalizedEmail(String(current.email))
            : params[key as keyof UpdateSubmitterParams] !== current[key as 'name' | 'phone'])
      ) ||
      (params.externalId !== undefined && current.external_id !== params.externalId) ||
      (params.completed === true && !current.completed_at && current.status !== 'completed') ||
      (params.metadata !== undefined &&
        !isDeepStrictEqual(current.metadata, params.metadata)) ||
      (['sendEmail', 'sendSms', 'requirePhone2fa', 'requireEmail2fa'] as const).some(
        key =>
          params[key] !== undefined &&
          current.preferences?.[aliases[key] ?? key] !== params[key]
      ) ||
      (params.values !== undefined &&
        Object.entries(params.values).some(
          ([field, v]) =>
            !current.values?.some(
              entry => entry.field === field && isDeepStrictEqual(entry.value, v)
            )
        ))
    )
      fail(
        'DocuSeal did not confirm the requested submitter state. Sending or signing may already have completed; read current state before retrying.',
        'docuseal_unconfirmed_mutation'
      );
    return current;
  }
}
