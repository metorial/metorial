import { createAxios } from 'slates';
import { adobeSignApiError, adobeSignServiceError } from './errors';

type AgreementFileInfo = {
  transientDocumentId?: string;
  libraryDocumentId?: string;
  urlFileInfo?: { url: string; name?: string; mimeType?: string };
};

let validateBase64 = (value: string, fieldName: string) => {
  if (!value.trim()) {
    throw adobeSignServiceError(`${fieldName} must contain base64-encoded file content.`);
  }

  try {
    return atob(value);
  } catch (error) {
    let serviceError = adobeSignServiceError(`${fieldName} must be valid base64 data.`);
    if (error instanceof Error) serviceError.setParent(error);
    throw serviceError;
  }
};

let validateFileInfos = (fileInfos: AgreementFileInfo[], label: string) => {
  if (fileInfos.length === 0) {
    throw adobeSignServiceError(`${label} requires at least one fileInfo.`);
  }

  for (let [index, fileInfo] of fileInfos.entries()) {
    let sourceCount = [
      fileInfo.transientDocumentId,
      fileInfo.libraryDocumentId,
      fileInfo.urlFileInfo?.url
    ].filter(Boolean).length;

    if (sourceCount !== 1) {
      throw adobeSignServiceError(
        `${label} fileInfos[${index}] must provide exactly one of transientDocumentId, libraryDocumentId, or urlFileInfo.url.`
      );
    }
  }
};

export class Client {
  private ax;

  constructor(config: { token: string; apiBaseUrl?: string; shard?: string }) {
    let baseURL = config.apiBaseUrl || `https://api.${config.shard || 'na1'}.adobesign.com/`;
    // Ensure trailing slash is removed for consistent URL joining
    if (baseURL.endsWith('/')) {
      baseURL = baseURL.slice(0, -1);
    }
    this.ax = createAxios({
      baseURL,
      headers: {
        Authorization: `Bearer ${config.token}`
      }
    });
    this.ax.interceptors.response.use(
      (response: any) => response,
      (error: unknown) => Promise.reject(adobeSignApiError(error))
    );
  }

  // ── Transient Documents ────────────────────────────────────────────

  async uploadTransientDocument(params: {
    fileName: string;
    fileContent: string; // base64 encoded
    mimeType?: string;
  }): Promise<{ transientDocumentId: string }> {
    if (!params.fileName.trim()) {
      throw adobeSignServiceError('fileName is required.');
    }

    // Build multipart form data manually
    let boundary = `----SlatesFormBoundary${Date.now().toString(36)}`;
    let mimeType = params.mimeType || 'application/pdf';

    // Decode base64 to binary
    let binaryString = validateBase64(params.fileContent, 'fileContent');
    let bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Build form data parts
    let fileNamePart = `--${boundary}\r\nContent-Disposition: form-data; name="File-Name"\r\n\r\n${params.fileName}\r\n`;
    let mimeTypePart = `--${boundary}\r\nContent-Disposition: form-data; name="Mime-Type"\r\n\r\n${mimeType}\r\n`;
    let filePartHeader = `--${boundary}\r\nContent-Disposition: form-data; name="File"; filename="${params.fileName}"\r\nContent-Type: ${mimeType}\r\n\r\n`;
    let ending = `\r\n--${boundary}--\r\n`;

    let headerBytes = new TextEncoder().encode(fileNamePart + mimeTypePart + filePartHeader);
    let endingBytes = new TextEncoder().encode(ending);

    let combined = new Uint8Array(headerBytes.length + bytes.length + endingBytes.length);
    combined.set(headerBytes, 0);
    combined.set(bytes, headerBytes.length);
    combined.set(endingBytes, headerBytes.length + bytes.length);

    let response = await this.ax.post('/api/rest/v6/transientDocuments', combined, {
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      maxBodyLength: Number.POSITIVE_INFINITY,
      maxContentLength: Number.POSITIVE_INFINITY
    });

    return { transientDocumentId: response.data.transientDocumentId };
  }

  // ── Agreements ─────────────────────────────────────────────────────

  async createAgreement(params: {
    name: string;
    participantSetsInfo: Array<{
      memberInfos: Array<{ email: string; securityOption?: any }>;
      role: string;
      order?: number;
    }>;
    fileInfos: AgreementFileInfo[];
    signatureType?: string;
    state?: string;
    ccs?: Array<{ email: string }>;
    externalId?: { id: string };
    message?: string;
    reminderFrequency?: string;
    expirationTime?: string;
  }): Promise<any> {
    validateFileInfos(params.fileInfos, 'Agreement creation');

    let body: any = {
      name: params.name,
      participantSetsInfo: params.participantSetsInfo,
      fileInfos: params.fileInfos,
      signatureType: params.signatureType || 'ESIGN',
      state: params.state || 'IN_PROCESS'
    };

    if (params.ccs) body.ccs = params.ccs;
    if (params.externalId) body.externalId = params.externalId;
    if (params.message) body.message = params.message;
    if (params.reminderFrequency) body.reminderFrequency = params.reminderFrequency;
    if (params.expirationTime) body.expirationTime = params.expirationTime;

    let response = await this.ax.post('/api/rest/v6/agreements', body);
    return response.data;
  }

  async getAgreement(agreementId: string): Promise<any> {
    let response = await this.ax.get(`/api/rest/v6/agreements/${agreementId}`);
    return response.data;
  }

  async listAgreements(params?: {
    cursor?: string;
    pageSize?: number;
    externalId?: string;
    groupId?: string;
  }): Promise<any> {
    let queryParams: any = {};
    if (params?.cursor) queryParams.cursor = params.cursor;
    if (params?.pageSize) queryParams.pageSize = params.pageSize;
    if (params?.externalId) queryParams.externalId = params.externalId;
    if (params?.groupId) queryParams.groupId = params.groupId;

    let response = await this.ax.get('/api/rest/v6/agreements', { params: queryParams });
    return response.data;
  }

  async updateAgreementState(
    agreementId: string,
    state: string,
    params?: {
      cancellationInfo?: { comment?: string; notifyOthers?: boolean };
    }
  ): Promise<void> {
    let body: any = { state };
    if (params?.cancellationInfo) {
      body.agreementCancellationInfo = params.cancellationInfo;
    }
    await this.ax.put(`/api/rest/v6/agreements/${agreementId}/state`, body);
  }

  async getSigningUrls(agreementId: string): Promise<any> {
    let response = await this.ax.get(`/api/rest/v6/agreements/${agreementId}/signingUrls`);
    return response.data;
  }

  async getAgreementDocuments(agreementId: string): Promise<any> {
    let response = await this.ax.get(`/api/rest/v6/agreements/${agreementId}/documents`);
    return response.data;
  }

  async downloadAgreementDocument(agreementId: string, documentId: string): Promise<any> {
    let response = await this.ax.get(
      `/api/rest/v6/agreements/${agreementId}/documents/${documentId}`,
      {
        responseType: 'arraybuffer'
      }
    );
    return response.data;
  }

  async getAgreementAuditTrail(agreementId: string): Promise<any> {
    let response = await this.ax.get(`/api/rest/v6/agreements/${agreementId}/auditTrail`, {
      responseType: 'arraybuffer'
    });
    return response.data;
  }

  async getAgreementCombinedDocument(agreementId: string): Promise<any> {
    let response = await this.ax.get(
      `/api/rest/v6/agreements/${agreementId}/combinedDocument`,
      {
        responseType: 'arraybuffer'
      }
    );
    return response.data;
  }

  async getAgreementFormData(agreementId: string): Promise<string> {
    let response = await this.ax.get(`/api/rest/v6/agreements/${agreementId}/formData`, {
      responseType: 'text'
    });
    return response.data;
  }

  async getAgreementEvents(agreementId: string): Promise<any> {
    let response = await this.ax.get(`/api/rest/v6/agreements/${agreementId}/events`);
    return response.data;
  }

  // ── Reminders ──────────────────────────────────────────────────────

  async createReminder(params: {
    agreementId: string;
    recipientParticipantIds?: string[];
    comment?: string;
    frequency?: string;
    firstReminderDelay?: number;
  }): Promise<any> {
    if (!params.recipientParticipantIds || params.recipientParticipantIds.length === 0) {
      throw adobeSignServiceError(
        'recipientParticipantIds is required to create an Adobe Acrobat Sign reminder.'
      );
    }

    let body: any = {
      status: 'ACTIVE',
      recipientParticipantIds: params.recipientParticipantIds
    };
    if (params.comment) body.note = params.comment;
    if (params.frequency) body.frequency = params.frequency;
    if (params.firstReminderDelay !== undefined)
      body.firstReminderDelay = params.firstReminderDelay;

    let response = await this.ax.post(
      `/api/rest/v6/agreements/${params.agreementId}/reminders`,
      body
    );
    return response.data;
  }

  async listAgreementReminders(agreementId: string): Promise<any> {
    let response = await this.ax.get(`/api/rest/v6/agreements/${agreementId}/reminders`);
    return response.data;
  }

  // ── Web Forms (Widgets) ────────────────────────────────────────────

  async createWebForm(params: {
    name: string;
    fileInfos: AgreementFileInfo[];
    widgetParticipantSetInfo: {
      memberInfos: Array<{ email?: string; securityOption?: any }>;
      role: string;
    };
    state?: string;
    additionalParticipantSetsInfo?: Array<{
      memberInfos: Array<{ email: string }>;
      role: string;
    }>;
    ccs?: Array<{ email: string }>;
  }): Promise<any> {
    validateFileInfos(params.fileInfos, 'Web form creation');
    if (params.fileInfos.some(fileInfo => fileInfo.libraryDocumentId)) {
      throw adobeSignServiceError(
        'Web form creation does not support libraryDocumentId in current Adobe Acrobat Sign v6.'
      );
    }

    let body: any = {
      name: params.name,
      fileInfos: params.fileInfos,
      widgetParticipantSetInfo: params.widgetParticipantSetInfo,
      state: params.state || 'ACTIVE'
    };
    if (params.additionalParticipantSetsInfo)
      body.additionalParticipantSetsInfo = params.additionalParticipantSetsInfo;
    if (params.ccs) body.ccs = params.ccs;

    let response = await this.ax.post('/api/rest/v6/widgets', body);
    return response.data;
  }

  async getWebForm(widgetId: string): Promise<any> {
    let response = await this.ax.get(`/api/rest/v6/widgets/${widgetId}`);
    return response.data;
  }

  async listWebForms(params?: { cursor?: string; pageSize?: number }): Promise<any> {
    let queryParams: any = {};
    if (params?.cursor) queryParams.cursor = params.cursor;
    if (params?.pageSize) queryParams.pageSize = params.pageSize;

    let response = await this.ax.get('/api/rest/v6/widgets', { params: queryParams });
    return response.data;
  }

  async updateWebFormState(widgetId: string, state: string, message?: string): Promise<void> {
    let body: any = {
      state
    };
    if (message) body.widgetInActiveInfo = { message };
    await this.ax.put(`/api/rest/v6/widgets/${widgetId}/state`, body);
  }

  // ── Library Templates ──────────────────────────────────────────────

  async createLibraryDocument(params: {
    name: string;
    fileInfos: Array<{
      transientDocumentId?: string;
    }>;
    templateTypes: string[];
    sharingMode?: string;
    state?: string;
  }): Promise<any> {
    validateFileInfos(params.fileInfos, 'Library template creation');

    let body: any = {
      name: params.name,
      fileInfos: params.fileInfos,
      templateTypes: params.templateTypes,
      sharingMode: params.sharingMode || 'USER',
      state: params.state || 'ACTIVE'
    };

    let response = await this.ax.post('/api/rest/v6/libraryDocuments', body);
    return response.data;
  }

  async getLibraryDocument(libraryDocumentId: string): Promise<any> {
    let response = await this.ax.get(`/api/rest/v6/libraryDocuments/${libraryDocumentId}`);
    return response.data;
  }

  async listLibraryDocuments(params?: { cursor?: string; pageSize?: number }): Promise<any> {
    let queryParams: any = {};
    if (params?.cursor) queryParams.cursor = params.cursor;
    if (params?.pageSize) queryParams.pageSize = params.pageSize;

    let response = await this.ax.get('/api/rest/v6/libraryDocuments', { params: queryParams });
    return response.data;
  }

  async updateLibraryDocumentState(libraryDocumentId: string, state: string): Promise<void> {
    await this.ax.put(`/api/rest/v6/libraryDocuments/${libraryDocumentId}/state`, { state });
  }

  // ── MegaSign (Send in Bulk) ────────────────────────────────────────

  async createMegaSign(params: {
    name: string;
    fileInfos: Array<{
      transientDocumentId?: string;
      libraryDocumentId?: string;
    }>;
    childAgreementsTransientDocumentId: string;
    signatureType?: string;
    state?: string;
    message?: string;
    ccs?: Array<{ email: string }>;
  }): Promise<any> {
    validateFileInfos(params.fileInfos, 'Send in Bulk creation');
    if (!params.childAgreementsTransientDocumentId.trim()) {
      throw adobeSignServiceError(
        'childAgreementsTransientDocumentId is required for Send in Bulk creation.'
      );
    }

    let body: any = {
      name: params.name,
      fileInfos: params.fileInfos,
      childAgreementsInfo: {
        fileInfo: {
          transientDocumentId: params.childAgreementsTransientDocumentId,
          fileType: 'CSV'
        }
      },
      signatureType: params.signatureType || 'ESIGN',
      state: params.state || 'IN_PROCESS'
    };
    if (params.message) body.message = params.message;
    if (params.ccs) body.ccs = params.ccs;

    let response = await this.ax.post('/api/rest/v6/megaSigns', body);
    return response.data;
  }

  async getMegaSign(megaSignId: string): Promise<any> {
    let response = await this.ax.get(`/api/rest/v6/megaSigns/${megaSignId}`);
    return response.data;
  }

  async listMegaSigns(params?: { cursor?: string; pageSize?: number }): Promise<any> {
    let queryParams: any = {};
    if (params?.cursor) queryParams.cursor = params.cursor;
    if (params?.pageSize) queryParams.pageSize = params.pageSize;

    let response = await this.ax.get('/api/rest/v6/megaSigns', { params: queryParams });
    return response.data;
  }

  async updateMegaSignState(
    megaSignId: string,
    state: string,
    params?: { cancellationInfo?: { comment?: string; notifyOthers?: boolean } }
  ): Promise<void> {
    let body: any = { state };
    if (params?.cancellationInfo) {
      body.megaSignCancellationInfo = params.cancellationInfo;
    }
    await this.ax.put(`/api/rest/v6/megaSigns/${megaSignId}/state`, body);
  }

  // ── Users ──────────────────────────────────────────────────────────

  async listUsers(params?: { cursor?: string; pageSize?: number }): Promise<any> {
    let queryParams: any = {};
    if (params?.cursor) queryParams.cursor = params.cursor;
    if (params?.pageSize) queryParams.pageSize = params.pageSize;

    let response = await this.ax.get('/api/rest/v6/users', { params: queryParams });
    return response.data;
  }

  async getUser(userId: string): Promise<any> {
    let response = await this.ax.get(`/api/rest/v6/users/${userId}`);
    return response.data;
  }

  // ── Webhooks ───────────────────────────────────────────────────────

  async createWebhook(params: {
    name: string;
    scope: string;
    webhookSubscriptionEvents: string[];
    webhookUrlInfo: { url: string };
    state?: string;
    resourceType?: string;
    resourceId?: string;
    webhookConditionalParams?: any;
  }): Promise<{ webhookId: string }> {
    let body: any = {
      name: params.name,
      scope: params.scope,
      state: params.state || 'ACTIVE',
      webhookSubscriptionEvents: params.webhookSubscriptionEvents,
      webhookUrlInfo: params.webhookUrlInfo
    };
    if (params.resourceType) body.resourceType = params.resourceType;
    if (params.resourceId) body.resourceId = params.resourceId;
    if (params.webhookConditionalParams)
      body.webhookConditionalParams = params.webhookConditionalParams;

    let response = await this.ax.post('/api/rest/v6/webhooks', body);
    return { webhookId: response.data.id };
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    await this.ax.delete(`/api/rest/v6/webhooks/${webhookId}`);
  }

  async getWebhook(webhookId: string): Promise<any> {
    let response = await this.ax.get(`/api/rest/v6/webhooks/${webhookId}`);
    return response.data;
  }

  async listWebhooks(params?: { cursor?: string; pageSize?: number }): Promise<any> {
    let queryParams: any = {};
    if (params?.cursor) queryParams.cursor = params.cursor;
    if (params?.pageSize) queryParams.pageSize = params.pageSize;

    let response = await this.ax.get('/api/rest/v6/webhooks', { params: queryParams });
    return response.data;
  }

  // ── Agreement Members / Participants ───────────────────────────────

  async getAgreementMembers(agreementId: string): Promise<any> {
    let response = await this.ax.get(`/api/rest/v6/agreements/${agreementId}/members`);
    return response.data;
  }

  // ── Agreement Views ────────────────────────────────────────────────

  async createAgreementView(agreementId: string, viewName: string): Promise<any> {
    let response = await this.ax.post(`/api/rest/v6/agreements/${agreementId}/views`, {
      name: viewName
    });
    return response.data;
  }
}
