import { createAxios } from 'slates';

export interface ClientConfig {
  token: string;
  baseUrl: string;
}

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: ClientConfig) {
    this.axios = createAxios({
      baseURL: config.baseUrl,
      headers: {
        Authorization: config.token
      }
    });
  }

  // ─── Envelopes ──────────────────────────────────────────

  async findEnvelopes(params: {
    query?: string;
    page?: number;
    perPage?: number;
    type?: 'DOCUMENT' | 'TEMPLATE';
    status?: string;
    folderId?: string;
    orderByColumn?: string;
    orderByDirection?: 'asc' | 'desc';
  }) {
    let response = await this.axios.get('/envelope', { params });
    return response.data;
  }

  async getEnvelope(envelopeId: string) {
    let response = await this.axios.get(`/envelope/${envelopeId}`);
    return response.data;
  }

  async createEnvelope(
    payload: {
      title: string;
      type: 'DOCUMENT' | 'TEMPLATE';
      folderId?: string;
      recipients?: Array<{
        email: string;
        name?: string;
        role?: string;
        signingOrder?: number;
      }>;
      meta?: Record<string, unknown>;
    },
    files?: Array<{ name: string; data: string }>
  ) {
    let formData = new FormData();
    formData.append('payload', JSON.stringify(payload));

    if (files) {
      for (let file of files) {
        let blob = new Blob([Buffer.from(file.data, 'base64')], { type: 'application/pdf' });
        formData.append('files', blob, file.name);
      }
    }

    let response = await this.axios.post('/envelope/create', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }

  async updateEnvelope(
    envelopeId: string,
    data: {
      title?: string;
      meta?: Record<string, unknown>;
    }
  ) {
    let response = await this.axios.post('/envelope/update', {
      envelopeId,
      ...data
    });
    return response.data;
  }

  async deleteEnvelope(envelopeId: string) {
    let response = await this.axios.post('/envelope/delete', { envelopeId });
    return response.data;
  }

  async distributeEnvelope(envelopeId: string) {
    let response = await this.axios.post('/envelope/distribute', { envelopeId });
    return response.data;
  }

  async redistributeEnvelope(envelopeId: string) {
    let response = await this.axios.post('/envelope/redistribute', { envelopeId });
    return response.data;
  }

  async duplicateEnvelope(envelopeId: string) {
    let response = await this.axios.post('/envelope/duplicate', { envelopeId });
    return response.data;
  }

  async getEnvelopeAuditLog(
    envelopeId: string,
    params?: {
      page?: number;
      perPage?: number;
    }
  ) {
    let response = await this.axios.get(`/envelope/${envelopeId}/audit-log`, { params });
    return response.data;
  }

  // ─── Documents (legacy) ─────────────────────────────────

  async findDocuments(params: {
    query?: string;
    page?: number;
    perPage?: number;
    status?: string;
    folderId?: string;
    orderByColumn?: string;
    orderByDirection?: 'asc' | 'desc';
  }) {
    let response = await this.axios.get('/document', { params });
    return response.data;
  }

  async getDocument(documentId: string) {
    let response = await this.axios.get(`/document/${documentId}`);
    return response.data;
  }

  async deleteDocument(documentId: string) {
    let response = await this.axios.post('/document/delete', { documentId });
    return response.data;
  }

  async distributeDocument(documentId: string) {
    let response = await this.axios.post('/document/distribute', { documentId });
    return response.data;
  }

  async moveDocument(documentId: string, folderId: string) {
    let response = await this.axios.post('/document/move', { documentId, folderId });
    return response.data;
  }

  // ─── Envelope Recipients ────────────────────────────────

  async getRecipient(recipientId: number) {
    let response = await this.axios.get(`/envelope/recipient/${recipientId}`);
    return response.data;
  }

  async createRecipients(
    envelopeId: string,
    data: Array<{
      email: string;
      name?: string;
      role?: string;
      signingOrder?: number;
      accessAuth?: Record<string, unknown>;
      actionAuth?: Record<string, unknown>;
    }>
  ) {
    let response = await this.axios.post('/envelope/recipient/create-many', {
      envelopeId,
      data
    });
    return response.data;
  }

  async updateRecipients(
    envelopeId: string,
    data: Array<{
      recipientId: number;
      email?: string;
      name?: string;
      role?: string;
      signingOrder?: number;
    }>
  ) {
    let response = await this.axios.post('/envelope/recipient/update-many', {
      envelopeId,
      data
    });
    return response.data;
  }

  async deleteRecipient(recipientId: number) {
    let response = await this.axios.post('/envelope/recipient/delete', { recipientId });
    return response.data;
  }

  // ─── Envelope Fields ────────────────────────────────────

  async getField(fieldId: number) {
    let response = await this.axios.get(`/envelope/field/${fieldId}`);
    return response.data;
  }

  async createFields(
    envelopeId: string,
    data: Array<{
      type: string;
      recipientId: number;
      envelopeItemId?: string;
      pageNumber: number;
      pageX: number;
      pageY: number;
      width: number;
      height: number;
      fieldMeta?: Record<string, unknown>;
    }>
  ) {
    let response = await this.axios.post('/envelope/field/create-many', {
      envelopeId,
      data
    });
    return response.data;
  }

  async updateFields(
    envelopeId: string,
    data: Array<{
      fieldId: number;
      type?: string;
      pageNumber?: number;
      pageX?: number;
      pageY?: number;
      width?: number;
      height?: number;
      fieldMeta?: Record<string, unknown>;
    }>
  ) {
    let response = await this.axios.post('/envelope/field/update-many', {
      envelopeId,
      data
    });
    return response.data;
  }

  async deleteField(fieldId: number) {
    let response = await this.axios.post('/envelope/field/delete', { fieldId });
    return response.data;
  }

  // ─── Envelope Items ─────────────────────────────────────

  async createEnvelopeItems(envelopeId: string, files: Array<{ name: string; data: string }>) {
    let formData = new FormData();
    formData.append('payload', JSON.stringify({ envelopeId }));

    for (let file of files) {
      let blob = new Blob([Buffer.from(file.data, 'base64')], { type: 'application/pdf' });
      formData.append('files', blob, file.name);
    }

    let response = await this.axios.post('/envelope/item/create-many', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }

  async updateEnvelopeItems(
    envelopeId: string,
    data: Array<{
      envelopeItemId: string;
      title?: string;
      order?: number;
    }>
  ) {
    let response = await this.axios.post('/envelope/item/update-many', {
      envelopeId,
      data
    });
    return response.data;
  }

  async deleteEnvelopeItem(envelopeId: string, envelopeItemId: string) {
    let response = await this.axios.post('/envelope/item/delete', {
      envelopeId,
      envelopeItemId
    });
    return response.data;
  }

  // ─── Envelope Attachments ───────────────────────────────

  async findAttachments(envelopeId: string) {
    let response = await this.axios.get('/envelope/attachment', {
      params: { envelopeId }
    });
    return response.data;
  }

  async createAttachment(envelopeId: string, data: { label: string; data: string }) {
    let response = await this.axios.post('/envelope/attachment/create', {
      envelopeId,
      data
    });
    return response.data;
  }

  async deleteAttachment(attachmentId: string) {
    let response = await this.axios.post('/envelope/attachment/delete', { id: attachmentId });
    return response.data;
  }

  // ─── Templates ──────────────────────────────────────────

  async findTemplates(params?: {
    query?: string;
    page?: number;
    perPage?: number;
    folderId?: string;
  }) {
    let response = await this.axios.get('/envelope', {
      params: { ...params, type: 'TEMPLATE' }
    });
    return response.data;
  }

  async useTemplate(
    templateId: string,
    data: {
      recipients?: Array<{
        recipientId: number;
        email?: string;
        name?: string;
      }>;
      prefillFields?: Array<{
        fieldId: number;
        value: string;
      }>;
    }
  ) {
    let response = await this.axios.post('/envelope/use', {
      envelopeId: templateId,
      ...data
    });
    return response.data;
  }

  // ─── Folders ────────────────────────────────────────────

  async findFolders(params?: {
    query?: string;
    page?: number;
    perPage?: number;
    parentFolderId?: string;
  }) {
    let response = await this.axios.get('/folder', { params });
    return response.data;
  }

  async createFolder(data: { name: string; parentFolderId?: string }) {
    let response = await this.axios.post('/folder/create', data);
    return response.data;
  }

  async updateFolder(folderId: string, data: { name?: string }) {
    let response = await this.axios.post('/folder/update', { folderId, ...data });
    return response.data;
  }

  async deleteFolder(folderId: string) {
    let response = await this.axios.post('/folder/delete', { folderId });
    return response.data;
  }

  // ─── Embedding ──────────────────────────────────────────

  async createEmbeddingPresignToken(envelopeId: string, recipientId?: number) {
    let response = await this.axios.post('/embedding/presign', {
      envelopeId,
      recipientId
    });
    return response.data;
  }
}
