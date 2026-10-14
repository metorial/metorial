import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';
import { z } from 'zod';

export let SIGNWELL_API_BASE_URL = 'https://www.signwell.com/api/v1';

let accountSchema = z.object({
  id: z.string(),
  name: z.string(),
  plan_tier: z.string().nullish()
});
let credentialsSchema = z.object({
  id: z.string(),
  role: z.string(),
  user: z.object({ id: z.string(), name: z.string(), email: z.string() }),
  account: accountSchema,
  workspace: accountSchema.optional()
});

export type SignWellRecipient = {
  id?: string;
  name?: string | null;
  email?: string | null;
  status?: string | null;
  signed_at?: string | null;
  embedded_signing_url?: string | null;
  signing_url?: string | null;
};

export type SignWellField = {
  api_id?: string | null;
  type?: string | null;
  page?: number | null;
  recipient_id?: string | null;
  placeholder_name?: string | null;
};

export type SignWellDocument = {
  id: string;
  name?: string | null;
  status?: string | null;
  subject?: string | null;
  message?: string | null;
  is_draft?: boolean | null;
  apply_signing_order?: boolean | null;
  embedded_signing?: boolean | null;
  embedded_signing_url?: string | null;
  expires_in?: number | null;
  metadata?: Record<string, string> | null;
  created_at?: string | null;
  updated_at?: string | null;
  completed_at?: string | null;
  recipients?: SignWellRecipient[] | null;
  fields?: SignWellField[][] | null;
};

export type SignWellTemplate = {
  id: string;
  name?: string | null;
  status?: string | null;
  subject?: string | null;
  message?: string | null;
  is_draft?: boolean | null;
  reminders?: boolean | null;
  apply_signing_order?: boolean | null;
  allow_decline?: boolean | null;
  expires_in?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  placeholders?: Array<{ id?: string; name?: string | null }> | null;
  fields?: SignWellField[][] | null;
};

export class SignWellClient {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError(
        'A SignWell API key is required. Reconnect with a valid API key.'
      );
    }
    this.axios = createAuthenticatedAxios({
      baseURL: SIGNWELL_API_BASE_URL,
      timeout: 30000,
      authHeader: { name: 'X-Api-Key', value: config.token },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'SignWell',
          reason: 'signwell_api_error',
          nestedKeys: ['errors', 'meta', 'messages']
        })
    });
  }

  private validateFiles(
    files: Array<{ fileUrl?: string; fileBase64?: string }> | undefined,
    fields: Array<Array<{ page: number }>> | undefined
  ) {
    if (!files?.length) {
      throw createApiServiceError('Provide at least one file.');
    }
    if (files.some(file => !!file.fileUrl === !!file.fileBase64)) {
      throw createApiServiceError(
        'Provide exactly one of fileUrl or fileBase64 for each file.'
      );
    }
    if (fields && fields.length !== files.length) {
      throw createApiServiceError(
        'Provide one field array per file, using an empty array for files without fields.'
      );
    }
    if (
      fields?.some(group =>
        group.some(field => !Number.isInteger(field.page) || field.page < 1)
      )
    ) {
      throw createApiServiceError(
        'Field page numbers must be positive integers starting at 1 within each file.'
      );
    }
  }

  // ── Documents ──────────────────────────────────────────────

  async createDocument(params: {
    name?: string;
    subject?: string;
    message?: string;
    draft?: boolean;
    testMode?: boolean;
    embeddedSigning?: boolean;
    embeddedSigningNotifications?: boolean;
    reminders?: boolean;
    applySigningOrder?: boolean;
    textTags?: boolean;
    withSignaturePage?: boolean;
    allowDecline?: boolean;
    allowReassign?: boolean;
    expiresIn?: number;
    files?: Array<{ name: string; fileUrl?: string; fileBase64?: string }>;
    recipients: Array<{
      id: string;
      name: string;
      email: string;
      signingOrder?: number;
    }>;
    fields?: Array<
      Array<{
        type: string;
        required?: boolean;
        x: number;
        y: number;
        page: number;
        recipientId: string;
        apiId?: string;
        width?: number;
        height?: number;
        dateFormat?: string;
        value?: string;
        fixedWidth?: boolean;
        lockSignDate?: boolean;
      }>
    >;
    metadata?: Record<string, string>;
    copiedContacts?: Array<{ email: string; name?: string }>;
  }) {
    this.validateFiles(params.files, params.fields);
    if (!params.recipients.length) {
      throw createApiServiceError('Provide at least one document recipient.');
    }
    if (
      !params.draft &&
      !params.textTags &&
      !params.withSignaturePage &&
      !params.fields?.some(group => group.length)
    ) {
      throw createApiServiceError(
        'Provide signing fields, enable textTags or withSignaturePage, or create the document as a draft.'
      );
    }
    let body: Record<string, unknown> = {
      recipients: params.recipients.map(r => ({
        id: r.id,
        name: r.name,
        email: r.email,
        ...(r.signingOrder !== undefined ? { signing_order: r.signingOrder } : {})
      }))
    };

    if (params.name !== undefined) body.name = params.name;
    if (params.subject !== undefined) body.subject = params.subject;
    if (params.message !== undefined) body.message = params.message;
    if (params.draft !== undefined) body.draft = params.draft;
    if (params.testMode !== undefined) body.test_mode = params.testMode;
    if (params.embeddedSigning !== undefined) body.embedded_signing = params.embeddedSigning;
    if (params.embeddedSigningNotifications !== undefined)
      body.embedded_signing_notifications = params.embeddedSigningNotifications;
    if (params.reminders !== undefined) body.reminders = params.reminders;
    if (params.applySigningOrder !== undefined)
      body.apply_signing_order = params.applySigningOrder;
    if (params.textTags !== undefined) body.text_tags = params.textTags;
    if (params.withSignaturePage !== undefined)
      body.with_signature_page = params.withSignaturePage;
    if (params.allowDecline !== undefined) body.allow_decline = params.allowDecline;
    if (params.allowReassign !== undefined) body.allow_reassign = params.allowReassign;
    if (params.expiresIn !== undefined) body.expires_in = params.expiresIn;
    if (params.metadata !== undefined) body.metadata = params.metadata;

    if (params.files) {
      body.files = params.files.map(f => ({
        name: f.name,
        ...(f.fileUrl ? { file_url: f.fileUrl } : {}),
        ...(f.fileBase64 ? { file_base64: f.fileBase64 } : {})
      }));
    }

    if (params.fields) {
      body.fields = params.fields.map(fieldGroup =>
        fieldGroup.map(f => ({
          type: f.type,
          x: f.x,
          y: f.y,
          page: f.page,
          recipient_id: f.recipientId,
          ...(f.required !== undefined ? { required: f.required } : {}),
          ...(f.apiId ? { api_id: f.apiId } : {}),
          ...(f.width !== undefined ? { width: f.width } : {}),
          ...(f.height !== undefined ? { height: f.height } : {}),
          ...(f.dateFormat ? { date_format: f.dateFormat } : {}),
          ...(f.value !== undefined ? { value: f.value } : {}),
          ...(f.fixedWidth !== undefined ? { fixed_width: f.fixedWidth } : {}),
          ...(f.lockSignDate !== undefined ? { lock_sign_date: f.lockSignDate } : {})
        }))
      );
    }

    if (params.copiedContacts) {
      body.copied_contacts = params.copiedContacts.map(c => ({
        email: c.email,
        ...(c.name ? { name: c.name } : {})
      }));
    }

    let response = await this.axios.post<SignWellDocument>('/documents', body);
    return response.data;
  }

  async createDocumentFromTemplate(params: {
    templateId: string;
    name?: string;
    testMode?: boolean;
    draft?: boolean;
    embeddedSigning?: boolean;
    embeddedSigningNotifications?: boolean;
    reminders?: boolean;
    subject?: string;
    message?: string;
    expiresIn?: number;
    recipients: Array<{
      placeholderName: string;
      name: string;
      email: string;
    }>;
    templateFields?: Array<{
      apiId: string;
      value: string;
    }>;
    metadata?: Record<string, string>;
  }) {
    if (!params.recipients.length) {
      throw createApiServiceError(
        'Provide at least one recipient mapped to a template placeholder.'
      );
    }
    let body: Record<string, unknown> = {
      template_id: params.templateId,
      recipients: params.recipients.map(r => ({
        placeholder_name: r.placeholderName,
        name: r.name,
        email: r.email
      }))
    };

    if (params.name !== undefined) body.name = params.name;
    if (params.testMode !== undefined) body.test_mode = params.testMode;
    if (params.draft !== undefined) body.draft = params.draft;
    if (params.embeddedSigning !== undefined) body.embedded_signing = params.embeddedSigning;
    if (params.embeddedSigningNotifications !== undefined)
      body.embedded_signing_notifications = params.embeddedSigningNotifications;
    if (params.reminders !== undefined) body.reminders = params.reminders;
    if (params.subject !== undefined) body.subject = params.subject;
    if (params.message !== undefined) body.message = params.message;
    if (params.expiresIn !== undefined) body.expires_in = params.expiresIn;
    if (params.metadata !== undefined) body.metadata = params.metadata;

    if (params.templateFields) {
      body.template_fields = params.templateFields.map(f => ({
        api_id: f.apiId,
        value: f.value
      }));
    }

    let response = await this.axios.post<SignWellDocument>(
      '/document_templates/documents',
      body
    );
    return response.data;
  }

  async getDocument(documentId: string) {
    let response = await this.axios.get<SignWellDocument>(
      `/documents/${encodeURIComponent(documentId)}`
    );
    return response.data;
  }

  async sendDocument(
    documentId: string,
    params: {
      name?: string;
      subject?: string;
      message?: string;
      expiresIn?: number;
      reminders?: boolean;
      metadata?: Record<string, string>;
    } = {}
  ) {
    let body = {
      name: params.name,
      subject: params.subject,
      message: params.message,
      expires_in: params.expiresIn,
      reminders: params.reminders,
      metadata: params.metadata
    };
    let response = await this.axios.post<SignWellDocument>(
      `/documents/${encodeURIComponent(documentId)}/send`,
      body
    );
    return response.data;
  }

  async sendReminder(documentId: string) {
    let response = await this.axios.post(
      `/documents/${encodeURIComponent(documentId)}/remind`
    );
    return response.data;
  }

  async deleteDocument(documentId: string) {
    await this.axios.delete(`/documents/${encodeURIComponent(documentId)}`);
  }

  async getCompletedPdf(documentId: string, urlOnly: boolean = true) {
    let response = await this.axios.get(
      `/documents/${encodeURIComponent(documentId)}/completed_pdf`,
      {
        params: { url_only: urlOnly }
      }
    );
    return response.data;
  }

  async updateDocumentRecipients(
    documentId: string,
    recipients: Array<{
      recipientId: string;
      name?: string;
      email?: string;
    }>
  ) {
    if (
      !recipients.length ||
      recipients.some(r => r.name === undefined && r.email === undefined)
    ) {
      throw createApiServiceError(
        'Provide at least one recipient and a name or email to update for each recipient.'
      );
    }
    // The API requires both name and email; retain the unedited value for partial updates.
    let current = recipients.some(r => r.name === undefined || r.email === undefined)
      ? await this.getDocument(documentId)
      : undefined;
    let body = {
      recipients: recipients.map(r => {
        let existing = current?.recipients?.find(item => item.id === r.recipientId);
        let name = r.name ?? existing?.name;
        let email = r.email ?? existing?.email;
        if (!name || !email) {
          throw createApiServiceError(
            'Provide both name and email, or use a recipient ID returned by get_document so existing details can be retained.'
          );
        }
        return { id: r.recipientId, name, email };
      })
    };
    let response = await this.axios.patch<SignWellDocument>(
      `/documents/${encodeURIComponent(documentId)}/recipients`,
      body
    );
    return response.data;
  }

  // ── Templates ──────────────────────────────────────────────

  async getTemplate(templateId: string) {
    let response = await this.axios.get<SignWellTemplate>(
      `/document_templates/${encodeURIComponent(templateId)}`
    );
    return response.data;
  }

  async createTemplate(params: {
    name: string;
    subject?: string;
    message?: string;
    draft?: boolean;
    testMode?: boolean;
    reminders?: boolean;
    applySigningOrder?: boolean;
    textTags?: boolean;
    allowDecline?: boolean;
    allowReassign?: boolean;
    expiresIn?: number;
    files?: Array<{ name: string; fileUrl?: string; fileBase64?: string }>;
    placeholders: Array<{
      id: string;
      name: string;
      signingOrder?: number;
    }>;
    fields?: Array<
      Array<{
        type: string;
        required?: boolean;
        x: number;
        y: number;
        page: number;
        placeholderId: string;
        apiId?: string;
        width?: number;
        height?: number;
        dateFormat?: string;
        value?: string;
        fixedWidth?: boolean;
        lockSignDate?: boolean;
      }>
    >;
  }) {
    this.validateFiles(params.files, params.fields);
    if (!params.placeholders.length) {
      throw createApiServiceError('Provide at least one template placeholder.');
    }
    let body: Record<string, unknown> = {
      name: params.name,
      placeholders: params.placeholders.map(p => ({
        id: p.id,
        name: p.name,
        ...(p.signingOrder !== undefined ? { signing_order: p.signingOrder } : {})
      }))
    };

    if (params.subject !== undefined) body.subject = params.subject;
    if (params.message !== undefined) body.message = params.message;
    if (params.draft !== undefined) body.draft = params.draft;
    if (params.testMode !== undefined) body.test_mode = params.testMode;
    if (params.reminders !== undefined) body.reminders = params.reminders;
    if (params.applySigningOrder !== undefined)
      body.apply_signing_order = params.applySigningOrder;
    if (params.textTags !== undefined) body.text_tags = params.textTags;
    if (params.allowDecline !== undefined) body.allow_decline = params.allowDecline;
    if (params.allowReassign !== undefined) body.allow_reassign = params.allowReassign;
    if (params.expiresIn !== undefined) body.expires_in = params.expiresIn;

    if (params.files) {
      body.files = params.files.map(f => ({
        name: f.name,
        ...(f.fileUrl ? { file_url: f.fileUrl } : {}),
        ...(f.fileBase64 ? { file_base64: f.fileBase64 } : {})
      }));
    }

    if (params.fields) {
      body.fields = params.fields.map(fieldGroup =>
        fieldGroup.map(f => ({
          type: f.type,
          x: f.x,
          y: f.y,
          page: f.page,
          placeholder_id: f.placeholderId,
          ...(f.required !== undefined ? { required: f.required } : {}),
          ...(f.apiId ? { api_id: f.apiId } : {}),
          ...(f.width !== undefined ? { width: f.width } : {}),
          ...(f.height !== undefined ? { height: f.height } : {}),
          ...(f.dateFormat ? { date_format: f.dateFormat } : {}),
          ...(f.value !== undefined ? { value: f.value } : {}),
          ...(f.fixedWidth !== undefined ? { fixed_width: f.fixedWidth } : {}),
          ...(f.lockSignDate !== undefined ? { lock_sign_date: f.lockSignDate } : {})
        }))
      );
    }

    let response = await this.axios.post<SignWellTemplate>('/document_templates', body);
    return response.data;
  }

  async updateTemplate(
    templateId: string,
    params: {
      name?: string;
      subject?: string;
      message?: string;
      draft?: boolean;
      reminders?: boolean;
      applySigningOrder?: boolean;
      allowDecline?: boolean;
      allowReassign?: boolean;
      expiresIn?: number;
    }
  ) {
    if (!Object.values(params).some(value => value !== undefined)) {
      throw createApiServiceError('Provide at least one template setting to update.');
    }
    let body: Record<string, unknown> = {};

    if (params.draft !== undefined) body.draft = params.draft;
    if (params.name !== undefined) body.name = params.name;
    if (params.subject !== undefined) body.subject = params.subject;
    if (params.message !== undefined) body.message = params.message;
    if (params.reminders !== undefined) body.reminders = params.reminders;
    if (params.applySigningOrder !== undefined)
      body.apply_signing_order = params.applySigningOrder;
    if (params.allowDecline !== undefined) body.allow_decline = params.allowDecline;
    if (params.allowReassign !== undefined) body.allow_reassign = params.allowReassign;
    if (params.expiresIn !== undefined) body.expires_in = params.expiresIn;

    let response = await this.axios.put<SignWellTemplate>(
      `/document_templates/${encodeURIComponent(templateId)}`,
      body
    );
    return response.data;
  }

  async deleteTemplate(templateId: string) {
    await this.axios.delete(`/document_templates/${encodeURIComponent(templateId)}`);
  }

  // ── Webhooks ───────────────────────────────────────────────

  async listWebhooks() {
    let response = await this.axios.get('/hooks');
    return response.data;
  }

  async createWebhook(callbackUrl: string, testMode?: boolean) {
    let body: Record<string, unknown> = {
      callback_url: callbackUrl
    };
    if (testMode !== undefined) body.test_mode = testMode;

    let response = await this.axios.post('/hooks', body);
    return response.data;
  }

  async deleteWebhook(webhookId: string) {
    await this.axios.delete(`/hooks/${webhookId}`);
  }

  // ── Me ─────────────────────────────────────────────────────

  async getMe() {
    let response = await this.axios.get('/me');
    let result = credentialsSchema.safeParse(response.data);
    if (!result.success) {
      throw createApiServiceError(
        'SignWell returned incomplete account credentials. Reconnect with a valid API key.'
      );
    }
    return result.data;
  }

  // ── API Applications ───────────────────────────────────────

  async getApiApplication(applicationId: string) {
    let response = await this.axios.get(
      `/api_applications/${encodeURIComponent(applicationId)}`
    );
    return response.data;
  }

  // ── Bulk Send ──────────────────────────────────────────────

  async createBulkSend(params: {
    templateId: string;
    csvFile: string;
    testMode?: boolean;
    subject?: string;
    message?: string;
  }) {
    let body: Record<string, unknown> = {
      template_id: params.templateId,
      file: params.csvFile
    };
    if (params.testMode !== undefined) body.test_mode = params.testMode;
    if (params.subject !== undefined) body.subject = params.subject;
    if (params.message !== undefined) body.message = params.message;

    let response = await this.axios.post('/bulk_sends', body);
    return response.data;
  }

  async getBulkSend(bulkSendId: string) {
    let response = await this.axios.get(`/bulk_sends/${encodeURIComponent(bulkSendId)}`);
    return response.data;
  }
}
