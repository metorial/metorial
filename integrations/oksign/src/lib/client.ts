import { createAxios } from 'slates';

let BASE_URL = 'https://oksign.be/services/rest/v1';
let BASE_URL_V2 = 'https://oksign.be/services/rest/v2';

export interface OkSignResponse<T = string> {
  status: 'OK' | 'FAILED';
  reason: T;
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
  eid?: boolean;
  pen?: boolean;
  tan?: boolean;
  itsme?: boolean;
  smartid?: boolean;
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
  };
  signersinfo?: SignerInfo[];
  workflow?: Array<{ id: string; sequence: number }>;
}

export interface MetadataFieldInfo {
  name: string;
  value: string;
  inputtype: string;
  signerid: string;
}

export interface MetadataSignerInfo {
  signedby: string;
  actingas: string;
  authMethod: string;
  isodate: string;
  serialnumber: string;
  provider: string;
  signerid: string;
}

export interface DocumentMetadata {
  filename: string;
  size: number;
  nbrOfSigaturesRequired: number;
  nbrOfSigaturesValid: number;
  fields: MetadataFieldInfo[];
  signersinfo: MetadataSignerInfo[];
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
    this.token = config.token;
  }

  private getAxios() {
    return createAxios({
      baseURL: BASE_URL,
      headers: {
        'x-oksign-authorization': this.token,
        accept: 'application/json; charset=utf-8'
      }
    });
  }

  private getAxiosV2() {
    return createAxios({
      baseURL: BASE_URL_V2,
      headers: {
        'x-oksign-authorization': this.token,
        accept: 'application/json; charset=utf-8'
      }
    });
  }

  // ========== Document Management ==========

  async uploadDocument(
    fileContent: string,
    filename: string,
    contentType: string
  ): Promise<string> {
    let http = this.getAxios();
    let response = await http.post<OkSignResponse>('/document/upload', fileContent, {
      headers: {
        'x-oksign-filename': filename,
        'content-type': contentType
      }
    });
    if (response.data.status !== 'OK') {
      throw new Error(`Document upload failed: ${response.data.reason}`);
    }
    return response.data.reason;
  }

  async documentExists(docId: string): Promise<DocumentExistsInfo> {
    let http = this.getAxios();
    let response = await http.get<OkSignResponse<DocumentExistsInfo>>('/document/exists', {
      headers: {
        'x-oksign-docid': docId
      }
    });
    if (response.data.status !== 'OK') {
      throw new Error(`Document exists check failed: ${response.data.reason}`);
    }
    return response.data.reason;
  }

  async removeDocument(docId: string): Promise<void> {
    let http = this.getAxios();
    let response = await http.delete<OkSignResponse>('/document/remove', {
      headers: {
        'x-oksign-docid': docId
      }
    });
    if (response.data.status !== 'OK') {
      throw new Error(`Document removal failed: ${response.data.reason}`);
    }
  }

  // ========== Form Descriptor ==========

  async uploadFormDescriptor(
    docId: string,
    formDescriptor: FormDescriptor
  ): Promise<SignerUrl[]> {
    let http = this.getAxios();
    let response = await http.post<OkSignResponse<SignerUrl[]>>(
      '/formdesc/upload',
      formDescriptor,
      {
        headers: {
          'x-oksign-docid': docId,
          'content-type': 'application/json; charset=utf-8'
        }
      }
    );
    if (response.data.status !== 'OK') {
      throw new Error(
        `Form descriptor upload failed: ${JSON.stringify(response.data.reason)}`
      );
    }
    return response.data.reason;
  }

  async retrieveFormDescriptor(docId: string): Promise<any> {
    let http = this.getAxios();
    let response = await http.get<OkSignResponse<any>>('/formdesc/retrieve', {
      headers: {
        'x-oksign-docid': docId
      }
    });
    if (response.data.status !== 'OK') {
      throw new Error(`Form descriptor retrieval failed: ${response.data.reason}`);
    }
    return response.data.reason;
  }

  // ========== Notifications ==========

  async uploadNotifications(docId: string, payload: NotificationPayload): Promise<void> {
    let http = this.getAxios();
    let response = await http.post<OkSignResponse>('/notifications/upload', payload, {
      headers: {
        'x-oksign-docid': docId,
        'content-type': 'application/json; charset=utf-8'
      }
    });
    if (response.data.status !== 'OK') {
      throw new Error(`Notification upload failed: ${response.data.reason}`);
    }
  }

  // ========== Briefcase ==========

  async createBriefcase(config: BriefcaseConfig): Promise<any> {
    let http = this.getAxios();
    let response = await http.post<OkSignResponse<any>>('/briefcase/create', config, {
      headers: {
        'content-type': 'application/json; charset=utf-8'
      }
    });
    if (response.data.status !== 'OK') {
      throw new Error(`Briefcase creation failed: ${JSON.stringify(response.data.reason)}`);
    }
    return response.data.reason;
  }

  async retrieveBriefcase(briefcaseId: string): Promise<any> {
    let http = this.getAxios();
    let response = await http.get<OkSignResponse<any>>('/briefcase/retrieve', {
      headers: {
        'x-oksign-docid': briefcaseId
      }
    });
    if (response.data.status !== 'OK') {
      throw new Error(`Briefcase retrieval failed: ${response.data.reason}`);
    }
    return response.data.reason;
  }

  async removeBriefcase(briefcaseId: string): Promise<void> {
    let http = this.getAxios();
    let response = await http.delete<OkSignResponse>('/briefcase/remove', {
      headers: {
        'x-oksign-docid': briefcaseId
      }
    });
    if (response.data.status !== 'OK') {
      throw new Error(`Briefcase removal failed: ${response.data.reason}`);
    }
  }

  // ========== SignExpress ==========

  async createSignExpress(config: SignExpressConfig): Promise<any> {
    let http = this.getAxios();
    let response = await http.post<OkSignResponse<any>>('/signexpress/create', config, {
      headers: {
        'content-type': 'application/json; charset=utf-8'
      }
    });
    if (response.data.status !== 'OK') {
      throw new Error(`SignExpress creation failed: ${JSON.stringify(response.data.reason)}`);
    }
    return response.data.reason;
  }

  async retrieveSignExpress(tokenId: string): Promise<any> {
    let http = this.getAxios();
    let response = await http.get<OkSignResponse<any>>('/signexpress/retrieve', {
      headers: {
        'x-oksign-docid': tokenId
      }
    });
    if (response.data.status !== 'OK') {
      throw new Error(`SignExpress retrieval failed: ${response.data.reason}`);
    }
    return response.data.reason;
  }

  async removeSignExpress(tokenId: string): Promise<void> {
    let http = this.getAxios();
    let response = await http.delete<OkSignResponse>('/signexpress/remove', {
      headers: {
        'x-oksign-docid': tokenId
      }
    });
    if (response.data.status !== 'OK') {
      throw new Error(`SignExpress removal failed: ${response.data.reason}`);
    }
  }

  // ========== EditorExpress ==========

  async createEditorExpress(config: EditorExpressConfig): Promise<any> {
    let http = this.getAxios();
    let response = await http.post<OkSignResponse<any>>('/editorexpress/create', config, {
      headers: {
        'content-type': 'application/json; charset=utf-8'
      }
    });
    if (response.data.status !== 'OK') {
      throw new Error(
        `EditorExpress creation failed: ${JSON.stringify(response.data.reason)}`
      );
    }
    return response.data.reason;
  }

  async retrieveEditorExpress(tokenId: string): Promise<any> {
    let http = this.getAxios();
    let response = await http.get<OkSignResponse<any>>('/editorexpress/retrieve', {
      headers: {
        'x-oksign-docid': tokenId
      }
    });
    if (response.data.status !== 'OK') {
      throw new Error(`EditorExpress retrieval failed: ${response.data.reason}`);
    }
    return response.data.reason;
  }

  async removeEditorExpress(tokenId: string): Promise<void> {
    let http = this.getAxios();
    let response = await http.delete<OkSignResponse>('/editorexpress/remove', {
      headers: {
        'x-oksign-docid': tokenId
      }
    });
    if (response.data.status !== 'OK') {
      throw new Error(`EditorExpress removal failed: ${response.data.reason}`);
    }
  }

  // ========== Metadata ==========

  async retrieveMetadata(signedDocId: string): Promise<DocumentMetadata> {
    let http = this.getAxiosV2();
    let response = await http.get<OkSignResponse<DocumentMetadata>>('/metadata/retrieve', {
      headers: {
        'x-oksign-docid': signedDocId
      }
    });
    if (response.data.status !== 'OK') {
      throw new Error(`Metadata retrieval failed: ${JSON.stringify(response.data.reason)}`);
    }
    return response.data.reason;
  }

  // ========== Audit Trail ==========

  async retrieveAuditTrail(signedDocId: string): Promise<string> {
    let http = createAxios({
      baseURL: BASE_URL,
      headers: {
        'x-oksign-authorization': this.token,
        accept: 'application/pdf'
      },
      responseType: 'arraybuffer'
    });
    let response = await http.get('/audittrail/retrieve', {
      headers: {
        'x-oksign-docid': signedDocId
      }
    });
    // Returns PDF binary - we'll return base64 encoded

    let buffer = Buffer.from(response.data as ArrayBuffer);
    return buffer.toString('base64');
  }

  // ========== Contacts ==========

  async uploadContacts(contacts: Contact[]): Promise<void> {
    let http = this.getAxios();
    let response = await http.post<OkSignResponse>('/contacts/upload', contacts, {
      headers: {
        'content-type': 'application/json; charset=utf-8'
      }
    });
    if (response.data.status !== 'OK') {
      throw new Error(`Contacts upload failed: ${response.data.reason}`);
    }
  }

  async retrieveContacts(): Promise<any> {
    let http = this.getAxios();
    let response = await http.get<OkSignResponse<any>>('/contacts/retrieve');
    if (response.data.status !== 'OK') {
      throw new Error(`Contacts retrieval failed: ${response.data.reason}`);
    }
    return response.data.reason;
  }

  async removeContact(contactId: string): Promise<void> {
    let http = this.getAxios();
    let response = await http.delete<OkSignResponse>('/contacts/remove', {
      headers: {
        'x-oksign-docid': contactId
      }
    });
    if (response.data.status !== 'OK') {
      throw new Error(`Contact removal failed: ${response.data.reason}`);
    }
  }

  // ========== Account ==========

  async retrieveUsers(): Promise<any> {
    let http = this.getAxios();
    let response = await http.get<OkSignResponse<any>>('/users/retrieve');
    if (response.data.status !== 'OK') {
      throw new Error(`Users retrieval failed: ${response.data.reason}`);
    }
    return response.data.reason;
  }

  async retrieveCredits(): Promise<any> {
    let http = this.getAxios();
    let response = await http.get<OkSignResponse<any>>('/credits/retrieve');
    if (response.data.status !== 'OK') {
      throw new Error(`Credits retrieval failed: ${response.data.reason}`);
    }
    return response.data.reason;
  }

  async retrieveEmailTemplates(): Promise<any> {
    let http = this.getAxios();
    let response = await http.get<OkSignResponse<any>>('/emailtemplates/retrieve');
    if (response.data.status !== 'OK') {
      throw new Error(`Email templates retrieval failed: ${response.data.reason}`);
    }
    return response.data.reason;
  }

  async retrieveLinkedList(docId: string): Promise<any> {
    let http = this.getAxios();
    let response = await http.get<OkSignResponse<any>>('/linkedlist/retrieve', {
      headers: {
        'x-oksign-docid': docId
      }
    });
    if (response.data.status !== 'OK') {
      throw new Error(`Linked list retrieval failed: ${response.data.reason}`);
    }
    return response.data.reason;
  }

  // ========== Signer ID ==========

  async calculateSignerId(name: string, email: string): Promise<string> {
    let http = this.getAxios();
    let response = await http.post<OkSignResponse>(
      '/signerid/calculate',
      { name, email },
      {
        headers: {
          'content-type': 'application/json; charset=utf-8'
        }
      }
    );
    if (response.data.status !== 'OK') {
      throw new Error(`Signer ID calculation failed: ${response.data.reason}`);
    }
    return response.data.reason;
  }

  // ========== Org Token Info ==========

  async updateOrgTokenInfo(config: {
    callbackURL?: string;
    returnURL?: string;
    webhookURL?: string;
  }): Promise<void> {
    let http = this.getAxios();
    let response = await http.post<OkSignResponse>('/orgtokeninfo/update', config, {
      headers: {
        'content-type': 'application/json; charset=utf-8'
      }
    });
    if (response.data.status !== 'OK') {
      throw new Error(`Org token info update failed: ${response.data.reason}`);
    }
  }

  // ========== Email Attachments ==========

  async uploadEmailAttachment(
    fileContent: string,
    filename: string,
    contentType: string
  ): Promise<string> {
    let http = this.getAxios();
    let response = await http.post<OkSignResponse>('/emailattachment/upload', fileContent, {
      headers: {
        'x-oksign-filename': filename,
        'content-type': contentType
      }
    });
    if (response.data.status !== 'OK') {
      throw new Error(`Email attachment upload failed: ${response.data.reason}`);
    }
    return response.data.reason;
  }

  async removeEmailAttachment(attachmentId: string): Promise<void> {
    let http = this.getAxios();
    let response = await http.delete<OkSignResponse>('/emailattachment/remove', {
      headers: {
        'x-oksign-docid': attachmentId
      }
    });
    if (response.data.status !== 'OK') {
      throw new Error(`Email attachment removal failed: ${response.data.reason}`);
    }
  }

  // ========== Polling ==========

  async getSignedDocuments(from: string, to: string): Promise<SignedDocument[]> {
    let http = this.getAxios();
    let response = await http.get<OkSignResponse<SignedDocument[]>>('/documents/signed', {
      params: { from, to }
    });
    if (response.data.status !== 'OK') {
      throw new Error(
        `Signed documents retrieval failed: ${JSON.stringify(response.data.reason)}`
      );
    }
    return response.data.reason || [];
  }

  async getActiveDocuments(): Promise<any[]> {
    let http = this.getAxios();
    let response = await http.get<OkSignResponse<any[]>>('/documents/active');
    if (response.data.status !== 'OK') {
      throw new Error(
        `Active documents retrieval failed: ${JSON.stringify(response.data.reason)}`
      );
    }
    return response.data.reason || [];
  }

  async getWebhookErrors(from: string, to: string): Promise<any[]> {
    let http = this.getAxios();
    let response = await http.get<OkSignResponse<any[]>>('/webhooks/retrieve', {
      params: { from, to }
    });
    if (response.data.status !== 'OK') {
      throw new Error(
        `Webhook errors retrieval failed: ${JSON.stringify(response.data.reason)}`
      );
    }
    return response.data.reason || [];
  }
}
