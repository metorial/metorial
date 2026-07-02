import { createAxios } from 'slates';

export class SignWellClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://www.signwell.com/api/v1',
      headers: {
        'X-Api-Key': config.token,
        'Content-Type': 'application/json'
      }
    });
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
    let body: Record<string, any> = {
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
          ...(f.value ? { value: f.value } : {}),
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

    let response = await this.axios.post('/documents', body);
    return response.data;
  }

  async createDocumentFromTemplate(params: {
    templateId: string;
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
    let body: Record<string, any> = {
      template_id: params.templateId,
      recipients: params.recipients.map(r => ({
        placeholder_name: r.placeholderName,
        name: r.name,
        email: r.email
      }))
    };

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

    let response = await this.axios.post('/document_templates/documents', body);
    return response.data;
  }

  async getDocument(documentId: string) {
    let response = await this.axios.get(`/documents/${documentId}`);
    return response.data;
  }

  async sendDocument(documentId: string) {
    let response = await this.axios.post(`/documents/${documentId}/send`);
    return response.data;
  }

  async sendReminder(documentId: string) {
    let response = await this.axios.post(`/documents/${documentId}/remind`);
    return response.data;
  }

  async deleteDocument(documentId: string) {
    await this.axios.delete(`/documents/${documentId}`);
  }

  async getCompletedPdf(documentId: string, urlOnly: boolean = true) {
    let response = await this.axios.get(`/documents/${documentId}/completed_pdf`, {
      params: { url_only: urlOnly }
    });
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
    let body = {
      recipients: recipients.map(r => ({
        id: r.recipientId,
        ...(r.name !== undefined ? { name: r.name } : {}),
        ...(r.email !== undefined ? { email: r.email } : {})
      }))
    };
    let response = await this.axios.patch(`/documents/${documentId}/recipients`, body);
    return response.data;
  }

  // ── Templates ──────────────────────────────────────────────

  async getTemplate(templateId: string) {
    let response = await this.axios.get(`/document_templates/${templateId}`);
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
    let body: Record<string, any> = {
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
          ...(f.value ? { value: f.value } : {}),
          ...(f.fixedWidth !== undefined ? { fixed_width: f.fixedWidth } : {}),
          ...(f.lockSignDate !== undefined ? { lock_sign_date: f.lockSignDate } : {})
        }))
      );
    }

    let response = await this.axios.post('/template', body);
    return response.data;
  }

  async updateTemplate(
    templateId: string,
    params: {
      name?: string;
      subject?: string;
      message?: string;
      reminders?: boolean;
      applySigningOrder?: boolean;
      allowDecline?: boolean;
      allowReassign?: boolean;
      expiresIn?: number;
    }
  ) {
    let body: Record<string, any> = {};

    if (params.name !== undefined) body.name = params.name;
    if (params.subject !== undefined) body.subject = params.subject;
    if (params.message !== undefined) body.message = params.message;
    if (params.reminders !== undefined) body.reminders = params.reminders;
    if (params.applySigningOrder !== undefined)
      body.apply_signing_order = params.applySigningOrder;
    if (params.allowDecline !== undefined) body.allow_decline = params.allowDecline;
    if (params.allowReassign !== undefined) body.allow_reassign = params.allowReassign;
    if (params.expiresIn !== undefined) body.expires_in = params.expiresIn;

    let response = await this.axios.put(`/document_templates/${templateId}`, body);
    return response.data;
  }

  async deleteTemplate(templateId: string) {
    await this.axios.delete(`/document_templates/${templateId}`);
  }

  // ── Webhooks ───────────────────────────────────────────────

  async listWebhooks() {
    let response = await this.axios.get('/hooks');
    return response.data;
  }

  async createWebhook(callbackUrl: string, testMode?: boolean) {
    let body: Record<string, any> = {
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
    return response.data;
  }

  // ── API Applications ───────────────────────────────────────

  async getApiApplication(applicationId: string) {
    let response = await this.axios.get(`/api_applications/${applicationId}`);
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
    let body: Record<string, any> = {
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
    let response = await this.axios.get(`/bulk_sends/${bulkSendId}`);
    return response.data;
  }
}
