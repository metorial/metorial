import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  extractApiErrorMessage,
  getBase64ByteLength,
  requestAxiosData
} from 'slates';

let BASE_URL = 'https://oksign.be/services/rest/v1';
let BASE_URL_V2 = 'https://oksign.be/services/rest/v2';

export interface OkSignResponse<T = string> {
  status: 'OK' | 'FAILED';
  reason: T;
  docid?: string;
}

export interface DocumentExistsInfo {
  filename: string;
  template: boolean;
}

export interface SignerUrl {
  name: string;
  id: string;
  url: string;
}

export interface SignerInfo {
  id: string;
  name: string;
  email?: string;
  mobile?: string;
  actingas?: string;
}

export interface SigningOptions {
  eid?: boolean | Record<string, never>;
  pen?: boolean | Record<string, never>;
  tan?: boolean | Record<string, never>;
  itsme?: boolean | Record<string, never>;
  smartid?: boolean | Record<string, never>;
}

export interface FormField {
  signerid: string;
  inputtype: string;
  name: string;
  pagenbr?: number;
  posX?: number;
  posY?: number;
  width?: number;
  height?: number;
  required?: boolean;
  signingoptions?: SigningOptions;
  marker?: string;
  fnname?: string;
  value?: string;
  readonly?: boolean;
  selectoptions?: string[];
}

export interface FormDescriptor {
  reusable?: boolean;
  fields: FormField[];
  signersinfo: SignerInfo[];
  notifications?: any;
  logo?: string;
  sendtomeonly?: boolean;
  sendtomeemail?: string;
  assignto?: string;
  filename?: string;
  workflow?: any;
}

export interface SmtpNotification {
  sender?: string;
  to: string[];
  cc?: string[];
  replyto?: string;
  subject: string;
  body?: string;
  delay?: number;
  repeat?: number;
  reminder_days?: number;
  language?: string;
  attachments?: string[];
}

export interface SmsNotification {
  to: string[];
  subject: string;
  delay?: number;
  repeat?: number;
  reminder_days?: number;
  language?: string;
}

export interface NotificationPayload {
  notifications: {
    smtp?: SmtpNotification;
    sms?: SmsNotification;
    workflow?: Array<{ id: string; sequence: number }>;
  };
  signersinfo?: SignerInfo[];
  workflow?: Array<{ id: string; sequence: number }>;
}

export interface MetadataFieldInfo {
  name: string;
  value?: string;
  metadata?: { value?: string | MetadataSignerInfo };
  inputtype: string;
  signerid?: string;
}

export interface MetadataSignerInfo {
  signedby?: string;
  actingas?: string;
  authMethod?: string;
  isodate?: string;
  serialnumber?: string;
  provider?: string;
  signerid: string;
}

export interface DocumentMetadata {
  filename: string;
  size: number | string;
  nbrOfSigaturesRequired: number;
  nbrOfSigaturesValid: number;
  fields: MetadataFieldInfo[];
  signersinfo: SignerInfo[];
}

export interface Contact {
  name: string;
  email: string;
  mobile?: string;
  actingas?: string;
  group?: string;
}

export interface UserInfo {
  name: string;
  email: string;
  role: string;
  signerid: string;
  status: string;
}

export interface SignedDocument {
  source_docid: string;
  signed_docid: string;
  filename: string;
}

export interface BriefcaseConfig {
  packagename?: string;
  documents: Array<{ docid: string }>;
  callbackURL?: string;
  returnURL?: string;
  webhookURL?: string;
}

export interface SignExpressConfig {
  documents: Array<{ docid: string }>;
  signerid: string;
  validity?: number;
  callbackURL?: string;
  returnURL?: string;
}

export interface EditorExpressConfig {
  docid: string;
  showAnonymousSigners?: boolean;
  showMeSigner?: boolean;
  showSigningOptions?: boolean;
  showTeammembers?: boolean;
}

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    if (!config.token || /[\r\n]/.test(config.token)) {
      throw createApiServiceError(
        'OKSign authorization is missing or invalid. Reconnect your account.'
      );
    }
    this.token = config.token;
  }

  private getAxios(baseURL = BASE_URL) {
    return createAuthenticatedAxios({
      baseURL,
      authHeader: { name: 'x-oksign-authorization', value: this.token },
      contentType: 'application/json; charset=utf-8',
      headers: { accept: 'application/json; charset=utf-8' },
      timeout: 120000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'OKSign',
          reason: 'upstream_request_failed'
        })
    });
  }

  private async request<T>(
    operation: string,
    request: Parameters<typeof requestAxiosData<OkSignResponse<T>>>[1]
  ) {
    let response = await requestAxiosData(operation, request, (error, operation) =>
      buildApiServiceError(error, {
        providerLabel: 'OKSign',
        reason: 'upstream_request_failed',
        operation
      })
    );
    if (!response || response.status !== 'OK') {
      throw createApiServiceError(
        `OKSign ${operation} failed: ${extractApiErrorMessage(
          { response: { data: response } },
          {
            detailKeys: ['reason', 'message'],
            nestedKeys: ['reason'],
            fallbackMessage: 'Invalid API response'
          }
        )}`,
        { reason: 'upstream_request_failed', upstreamCode: response?.status }
      );
    }
    return response;
  }

  private async requestList<T>(
    operation: string,
    request: Parameters<typeof requestAxiosData<OkSignResponse<T[]>>>[1]
  ) {
    let response = await this.request<T[]>(operation, request);
    if (!Array.isArray(response.reason)) {
      throw createApiServiceError(`OKSign ${operation} returned an invalid list.`);
    }
    return response.reason;
  }

  private decodeUpload(fileContent: string, filename: string) {
    let normalized = fileContent.replace(/\s/g, '');
    if (
      !normalized ||
      !/^[A-Za-z0-9+/]*={0,2}$/.test(normalized) ||
      normalized.length % 4 === 1
    ) {
      throw createApiServiceError('Provide valid base64-encoded file content.');
    }
    let bytes = Buffer.from(normalized, 'base64');
    if (
      bytes.toString('base64').replace(/=+$/, '') !== normalized.replace(/=+$/, '') ||
      !bytes.length ||
      getBase64ByteLength(normalized) > 10 * 1024 * 1024
    ) {
      throw createApiServiceError('Provide a valid, non-empty file no larger than 10 MB.');
    }
    if (!filename || /[^\x20-\x7E]/.test(filename)) {
      throw createApiServiceError(
        'Use a non-empty filename containing only printable US-ASCII characters.'
      );
    }
    return bytes;
  }

  async uploadDocument(
    fileContent: string,
    filename: string,
    contentType: string
  ): Promise<string> {
    let bytes = this.decodeUpload(fileContent, filename);
    return (
      await this.request<string>('document upload', () =>
        this.getAxios().post('/document/upload', bytes, {
          headers: {
            'x-oksign-filename': filename,
            'content-type': contentType
          }
        })
      )
    ).reason;
  }

  async documentExists(docId: string): Promise<DocumentExistsInfo> {
    let response = (
      await this.request<DocumentExistsInfo>('document existence check', () =>
        this.getAxios().get('/document/exists', { headers: { 'x-oksign-docid': docId } })
      )
    ).reason;
    if (
      !response ||
      typeof response.filename !== 'string' ||
      typeof response.template !== 'boolean'
    ) {
      throw createApiServiceError('OKSign returned invalid document details.');
    }
    return response;
  }

  async removeDocument(docId: string): Promise<void> {
    await this.request('document removal', () =>
      this.getAxios().delete('/document/remove', {
        headers: { 'x-oksign-docid': docId }
      })
    );
  }

  async uploadFormDescriptor(
    docId: string,
    formDescriptor: FormDescriptor
  ): Promise<SignerUrl[]> {
    return await this.requestList<SignerUrl>('form configuration', () =>
      this.getAxios().post('/formdesc/upload', formDescriptor, {
        headers: { 'x-oksign-docid': docId }
      })
    );
  }

  async retrieveFormDescriptor(docId: string): Promise<unknown> {
    return (
      await this.request<unknown>('form retrieval', () =>
        this.getAxios().get('/formdesc/retrieve', { headers: { 'x-oksign-docid': docId } })
      )
    ).reason;
  }

  async uploadNotifications(docId: string, payload: NotificationPayload): Promise<void> {
    await this.request('notification upload', () =>
      this.getAxios().post('/notifications/upload', payload, {
        headers: { 'x-oksign-docid': docId }
      })
    );
  }

  async createBriefcase(config: BriefcaseConfig) {
    if (!config.documents.length)
      throw createApiServiceError('Include at least one document in the briefcase.');
    let response = await this.request<SignerUrl[]>('briefcase creation', () =>
      this.getAxios().post('/briefcase/create', {
        list: config.documents.map(document => document.docid),
        packagename: config.packagename,
        callbackurl: config.callbackURL,
        returnurl: config.returnURL,
        webhookurl: config.webhookURL
      })
    );
    if (typeof response.docid !== 'string' || !response.docid) {
      throw createApiServiceError('OKSign did not return a briefcase ID.');
    }
    return { docid: response.docid, signerurls: response.reason };
  }

  async retrieveBriefcase(briefcaseId: string): Promise<unknown> {
    return (
      await this.request<unknown>('briefcase retrieval', () =>
        this.getAxios().get('/briefcase/retrieve', {
          headers: { 'x-oksign-docid': briefcaseId }
        })
      )
    ).reason;
  }

  async removeBriefcase(briefcaseId: string): Promise<void> {
    await this.request('briefcase removal', () =>
      this.getAxios().delete('/briefcase/remove', {
        headers: { 'x-oksign-docid': briefcaseId }
      })
    );
  }

  async createSignExpress(config: SignExpressConfig): Promise<unknown> {
    if (!config.documents.length)
      throw createApiServiceError('Include at least one document in the signing session.');
    let validityperiod = config.validity === undefined ? undefined : config.validity * 86400;
    if (
      validityperiod !== undefined &&
      (!Number.isSafeInteger(validityperiod) || validityperiod <= 0)
    ) {
      throw createApiServiceError(
        'validityDays must produce a positive whole number of seconds.'
      );
    }
    return (
      await this.request<unknown>('SignExpress creation', () =>
        this.getAxios().post('/signexpress/create', {
          list: config.documents.map(document => document.docid),
          signerinfo: { id: config.signerid },
          validityperiod,
          callbackurl: config.callbackURL,
          returnurl: config.returnURL
        })
      )
    ).reason;
  }

  async retrieveSignExpress(tokenId: string): Promise<unknown> {
    return (
      await this.request<unknown>('SignExpress retrieval', () =>
        this.getAxios().get('/signexpress/retrieve', {
          headers: { 'x-oksign-token': tokenId }
        })
      )
    ).reason;
  }

  async removeSignExpress(tokenId: string): Promise<void> {
    await this.request('SignExpress removal', () =>
      this.getAxios().delete('/signexpress/remove', {
        headers: { 'x-oksign-token': tokenId }
      })
    );
  }

  async createEditorExpress(config: EditorExpressConfig): Promise<unknown> {
    return (
      await this.request<unknown>('EditorExpress creation', () =>
        this.getAxios().post('/editorexpress/create', {
          list: [config.docid],
          showAnonymousSigners: config.showAnonymousSigners,
          showMeSigner: config.showMeSigner,
          showTeammembers: config.showTeammembers,
          showSigningOptions:
            config.showSigningOptions === undefined
              ? undefined
              : {
                  eid: config.showSigningOptions,
                  itsme: config.showSigningOptions,
                  smartid: config.showSigningOptions ? {} : false,
                  pen: config.showSigningOptions,
                  tan: config.showSigningOptions
                }
        })
      )
    ).reason;
  }

  async retrieveEditorExpress(tokenId: string): Promise<unknown> {
    return (
      await this.request<unknown>('EditorExpress retrieval', () =>
        this.getAxios().get('/editorexpress/retrieve', {
          headers: { 'x-oksign-token': tokenId }
        })
      )
    ).reason;
  }

  async removeEditorExpress(tokenId: string): Promise<void> {
    await this.request('EditorExpress removal', () =>
      this.getAxios().delete('/editorexpress/remove', {
        headers: { 'x-oksign-token': tokenId }
      })
    );
  }

  async retrieveMetadata(signedDocId: string): Promise<DocumentMetadata> {
    let metadata = (
      await this.request<DocumentMetadata>('metadata retrieval', () =>
        this.getAxios(BASE_URL_V2).get('/metadata/retrieve', {
          headers: { 'x-oksign-docid': signedDocId }
        })
      )
    ).reason;
    if (
      !metadata ||
      typeof metadata.filename !== 'string' ||
      (typeof metadata.size !== 'string' && typeof metadata.size !== 'number') ||
      typeof metadata.nbrOfSigaturesRequired !== 'number' ||
      typeof metadata.nbrOfSigaturesValid !== 'number' ||
      (metadata.fields !== undefined && !Array.isArray(metadata.fields))
    ) {
      throw createApiServiceError('OKSign returned invalid document metadata.');
    }
    return metadata;
  }

  async retrieveAuditTrail(signedDocId: string): Promise<string> {
    let bytes = await requestAxiosData(
      'audit trail retrieval',
      () =>
        this.getAxios().get<ArrayBuffer>('/audittrail/retrieve', {
          responseType: 'arraybuffer',
          headers: {
            'x-oksign-docid': signedDocId,
            'x-oksign-format': 'pdf',
            accept: 'application/pdf'
          }
        }),
      (error, operation) =>
        buildApiServiceError(error, {
          providerLabel: 'OKSign',
          reason: 'upstream_request_failed',
          operation
        })
    );
    let buffer = Buffer.from(bytes);
    if (buffer.subarray(0, 5).toString() !== '%PDF-') {
      throw createApiServiceError('OKSign did not return a PDF audit trail report.');
    }
    return buffer.toString('base64');
  }

  async uploadContacts(contacts: Contact[]): Promise<void> {
    if (!contacts.length) throw createApiServiceError('Provide at least one contact.');
    await this.request('contacts upload', () =>
      this.getAxios().post('/contacts/upload', contacts)
    );
  }

  async retrieveContacts(): Promise<Contact[]> {
    return await this.requestList<Contact>('contacts retrieval', () =>
      this.getAxios().get('/contacts/retrieve')
    );
  }

  async removeContact(name: string, email: string): Promise<number | undefined> {
    return (
      await this.request<number | undefined>('contact removal', () =>
        this.getAxios().post('/contacts/remove', [{ name, email }])
      )
    ).reason;
  }

  async retrieveUsers(): Promise<UserInfo[]> {
    return await this.requestList<UserInfo>('users retrieval', () =>
      this.getAxios().get('/users/retrieve')
    );
  }

  async retrieveCredits(): Promise<unknown> {
    let response = await requestAxiosData(
      'credits retrieval',
      () =>
        this.getAxios().get<OkSignResponse<unknown> & { quantity?: number }>(
          '/credits/retrieve'
        ),
      (error, operation) =>
        buildApiServiceError(error, {
          providerLabel: 'OKSign',
          reason: 'upstream_request_failed',
          operation
        })
    );
    // The reference shows a bare credits object as well as the standard result envelope.
    if (response?.status === 'OK') return response.reason;
    if (response?.status === undefined && typeof response?.quantity === 'number')
      return response;
    throw createApiServiceError(
      `OKSign credits retrieval failed: ${extractApiErrorMessage(
        { response: { data: response } },
        { detailKeys: ['reason'], nestedKeys: ['reason'] }
      )}`
    );
  }

  async retrieveEmailTemplates(): Promise<unknown> {
    return (
      await this.request<unknown>('email templates retrieval', () =>
        this.getAxios().get('/email-templates/retrieve')
      )
    ).reason;
  }

  async retrieveLinkedList(docId: string): Promise<unknown> {
    return (
      await this.request<unknown>('linked documents retrieval', () =>
        this.getAxios().get('/linkedlist/retrieve', { headers: { 'x-oksign-docid': docId } })
      )
    ).reason;
  }

  async calculateSignerId(name: string, email: string): Promise<string> {
    return (
      await this.request<string>('signer ID calculation', () =>
        this.getAxios().post('/signerid/calculate', { name, email })
      )
    ).reason;
  }

  async updateOrgTokenInfo(config: {
    callbackURL?: string;
    returnURL?: string;
    webhookURL?: string;
  }): Promise<void> {
    if (
      config.callbackURL === undefined ||
      config.returnURL === undefined ||
      config.webhookURL === undefined
    ) {
      throw createApiServiceError(
        'Provide callbackUrl, returnUrl, and webhookUrl. Use an empty string to clear a URL. OKSign replaces all three values together.'
      );
    }
    await this.request('token configuration update', () =>
      this.getAxios().post('/orgtokeninfo/update', {
        callbackurl: config.callbackURL,
        returnurl: config.returnURL,
        webhookurl: config.webhookURL
      })
    );
  }

  async uploadEmailAttachment(
    fileContent: string,
    filename: string,
    contentType: string
  ): Promise<string> {
    let bytes = this.decodeUpload(fileContent, filename);
    return (
      await this.request<string>('email attachment upload', () =>
        this.getAxios().post('/emailattachment/upload', bytes, {
          headers: {
            'x-oksign-filename': filename,
            'content-type': contentType
          }
        })
      )
    ).reason;
  }

  async removeEmailAttachment(attachmentId: string): Promise<void> {
    await this.request('email attachment removal', () =>
      this.getAxios().delete('/emailattachment/remove', {
        headers: { 'x-oksign-docid': attachmentId }
      })
    );
  }

  async getSignedDocuments(from: string, to: string): Promise<SignedDocument[]> {
    return await this.requestList<SignedDocument>('signed documents retrieval', () =>
      this.getAxios().get('/documents/signed', {
        headers: {
          'x-oksign-starttime': from,
          'x-oksign-endtime': to
        }
      })
    );
  }

  async getActiveDocuments(): Promise<unknown[]> {
    return await this.requestList<unknown>('active documents retrieval', () =>
      this.getAxios().get('/documents/active')
    );
  }

  async getWebhookErrors(from: string, to: string): Promise<unknown[]> {
    return await this.requestList<unknown>('notification errors retrieval', () =>
      this.getAxios().get('/webhooks/retrieve', {
        headers: {
          'x-oksign-starttime': from,
          'x-oksign-endtime': to
        }
      })
    );
  }
}
