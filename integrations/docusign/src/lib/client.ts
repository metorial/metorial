import { createAxios } from 'slates';

export interface ClientConfig {
  token: string;
  baseUri: string;
  accountId: string;
}

export interface EnvelopeRecipient {
  email: string;
  name: string;
  recipientId?: string;
  routingOrder?: string;
  clientUserId?: string;
  roleName?: string;
  tabs?: Record<string, any>;
}

export interface EnvelopeDocument {
  documentBase64?: string;
  name: string;
  fileExtension?: string;
  documentId: string;
  order?: string;
}

export interface CreateEnvelopeRequest {
  emailSubject: string;
  emailBlurb?: string;
  status: 'created' | 'sent';
  documents?: EnvelopeDocument[];
  recipients?: {
    signers?: EnvelopeRecipient[];
    carbonCopies?: EnvelopeRecipient[];
    certifiedDeliveries?: EnvelopeRecipient[];
  };
  templateId?: string;
  templateRoles?: Array<{
    email: string;
    name: string;
    roleName: string;
    clientUserId?: string;
    tabs?: Record<string, any>;
  }>;
  compositeTemplates?: Array<{
    serverTemplates?: Array<{ sequence: string; templateId: string }>;
    inlineTemplates?: Array<{
      sequence: string;
      recipients?: any;
      documents?: EnvelopeDocument[];
    }>;
  }>;
  eventNotification?: Record<string, any>;
  notification?: {
    useAccountDefaults?: string;
    reminders?: {
      reminderEnabled?: string;
      reminderDelay?: string;
      reminderFrequency?: string;
    };
    expirations?: {
      expireEnabled?: string;
      expireAfter?: string;
      expireWarn?: string;
    };
  };
}

export interface ListEnvelopesParams {
  fromDate?: string;
  toDate?: string;
  status?: string;
  fromToStatus?: string;
  searchText?: string;
  count?: string;
  startPosition?: string;
  order?: string;
  orderBy?: string;
  include?: string;
  folderId?: string;
  userId?: string;
  envelopeIds?: string;
}

export interface ConnectConfiguration {
  name: string;
  urlToPublishTo: string;
  configurationType?: string;
  allUsers?: string;
  allowEnvelopePublish?: string;
  enableLog?: string;
  envelopeEvents?: string[];
  recipientEvents?: string[];
  eventData?: {
    version?: string;
    format?: string;
    includeData?: string[];
  };
  requiresAcknowledgement?: string;
  includeHMAC?: string;
}

export class Client {
  private token: string;
  private baseUri: string;
  private accountId: string;

  constructor(config: ClientConfig) {
    this.token = config.token;
    this.baseUri = config.baseUri;
    this.accountId = config.accountId;
  }

  private getAxios() {
    return createAxios({
      baseURL: `${this.baseUri}/restapi/v2.1/accounts/${this.accountId}`,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ---- Envelopes ----

  async createEnvelope(envelope: CreateEnvelopeRequest): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.post('/envelopes', envelope);
    return response.data;
  }

  async getEnvelope(envelopeId: string, include?: string): Promise<any> {
    let ax = this.getAxios();
    let params: Record<string, string> = {};
    if (include) params.include = include;
    let response = await ax.get(`/envelopes/${envelopeId}`, { params });
    return response.data;
  }

  async listEnvelopes(queryParams: ListEnvelopesParams): Promise<any> {
    let ax = this.getAxios();
    let params: Record<string, string> = {};
    if (queryParams.fromDate) params.from_date = queryParams.fromDate;
    if (queryParams.toDate) params.to_date = queryParams.toDate;
    if (queryParams.status) params.status = queryParams.status;
    if (queryParams.fromToStatus) params.from_to_status = queryParams.fromToStatus;
    if (queryParams.searchText) params.search_text = queryParams.searchText;
    if (queryParams.count) params.count = queryParams.count;
    if (queryParams.startPosition) params.start_position = queryParams.startPosition;
    if (queryParams.order) params.order = queryParams.order;
    if (queryParams.orderBy) params.order_by = queryParams.orderBy;
    if (queryParams.include) params.include = queryParams.include;
    if (queryParams.folderId) params.folder_ids = queryParams.folderId;
    if (queryParams.userId) params.user_id = queryParams.userId;
    if (queryParams.envelopeIds) params.envelope_ids = queryParams.envelopeIds;
    let response = await ax.get('/envelopes', { params });
    return response.data;
  }

  async updateEnvelope(envelopeId: string, updates: Record<string, any>): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.put(`/envelopes/${envelopeId}`, updates);
    return response.data;
  }

  async voidEnvelope(envelopeId: string, voidedReason: string): Promise<any> {
    return this.updateEnvelope(envelopeId, {
      status: 'voided',
      voidedReason
    });
  }

  // ---- Recipients ----

  async getRecipients(envelopeId: string, includeTabs?: boolean): Promise<any> {
    let ax = this.getAxios();
    let params: Record<string, string> = {};
    if (includeTabs) params.include_tabs = 'true';
    let response = await ax.get(`/envelopes/${envelopeId}/recipients`, { params });
    return response.data;
  }

  async updateRecipients(envelopeId: string, recipients: Record<string, any>): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.put(`/envelopes/${envelopeId}/recipients`, recipients);
    return response.data;
  }

  // ---- Documents ----

  async listDocuments(envelopeId: string): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.get(`/envelopes/${envelopeId}/documents`);
    return response.data;
  }

  async getDocument(envelopeId: string, documentId: string): Promise<string> {
    let ax = this.getAxios();
    let response = await ax.get(`/envelopes/${envelopeId}/documents/${documentId}`, {
      responseType: 'arraybuffer'
    });
    let binary = '';
    let bytes = new Uint8Array(response.data as ArrayBuffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]!);
    }
    return btoa(binary);
  }

  async getCombinedDocument(envelopeId: string): Promise<string> {
    return this.getDocument(envelopeId, 'combined');
  }

  // ---- Templates ----

  async listTemplates(queryParams?: {
    searchText?: string;
    count?: string;
    startPosition?: string;
    order?: string;
    orderBy?: string;
    folderId?: string;
    sharedByMe?: string;
    usedFromDate?: string;
    usedToDate?: string;
  }): Promise<any> {
    let ax = this.getAxios();
    let params: Record<string, string> = {};
    if (queryParams?.searchText) params.search_text = queryParams.searchText;
    if (queryParams?.count) params.count = queryParams.count;
    if (queryParams?.startPosition) params.start_position = queryParams.startPosition;
    if (queryParams?.order) params.order = queryParams.order;
    if (queryParams?.orderBy) params.order_by = queryParams.orderBy;
    if (queryParams?.folderId) params.folder_id = queryParams.folderId;
    if (queryParams?.sharedByMe) params.shared_by_me = queryParams.sharedByMe;
    if (queryParams?.usedFromDate) params.used_from_date = queryParams.usedFromDate;
    if (queryParams?.usedToDate) params.used_to_date = queryParams.usedToDate;
    let response = await ax.get('/templates', { params });
    return response.data;
  }

  async getTemplate(templateId: string): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.get(`/templates/${templateId}`);
    return response.data;
  }

  // ---- Embedded Signing ----

  async createRecipientView(
    envelopeId: string,
    viewRequest: {
      returnUrl: string;
      authenticationMethod: string;
      email: string;
      userName: string;
      clientUserId: string;
    }
  ): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.post(`/envelopes/${envelopeId}/views/recipient`, viewRequest);
    return response.data;
  }

  async createSenderView(envelopeId: string, returnUrl: string): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.post(`/envelopes/${envelopeId}/views/sender`, { returnUrl });
    return response.data;
  }

  // ---- Connect (Webhooks) ----

  async createConnectConfiguration(config: ConnectConfiguration): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.post('/connect', config);
    return response.data;
  }

  async deleteConnectConfiguration(connectId: string): Promise<void> {
    let ax = this.getAxios();
    await ax.delete(`/connect/${connectId}`);
  }

  async listConnectConfigurations(): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.get('/connect');
    return response.data;
  }

  // ---- Audit Events ----

  async getAuditEvents(envelopeId: string): Promise<any> {
    let ax = this.getAxios();
    let response = await ax.get(`/envelopes/${envelopeId}/audit_events`);
    return response.data;
  }
}
