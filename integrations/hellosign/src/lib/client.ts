import { createAxios } from 'slates';
import { hellosignApiError, hellosignServiceError } from './errors';

export interface ClientConfig {
  token: string;
  authMethod: 'oauth' | 'api_key';
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  query?: string;
}

export interface ListInfo {
  page: number;
  numPages: number;
  numResults: number;
  pageSize: number;
}

export interface Signer {
  name: string;
  emailAddress: string;
  order?: number;
  pin?: string;
  smsPhoneNumber?: string;
  smsPhoneNumberType?: string;
}

export interface SendSignatureRequestParams {
  title?: string;
  subject?: string;
  message?: string;
  signers: Signer[];
  ccEmailAddresses?: string[];
  fileUrls?: string[];
  metadata?: Record<string, string>;
  allowDecline?: boolean;
  allowReassign?: boolean;
  useTextTags?: boolean;
  signingRedirectUrl?: string;
  testMode?: boolean;
  clientId?: string;
  embeddedSigning?: boolean;
}

export interface SendWithTemplateParams {
  templateIds: string[];
  title?: string;
  subject?: string;
  message?: string;
  signers: { role: string; name: string; emailAddress: string; pin?: string }[];
  ccs?: { role: string; emailAddress: string }[];
  customFields?: { name: string; value: string }[];
  metadata?: Record<string, string>;
  signingRedirectUrl?: string;
  testMode?: boolean;
  clientId?: string;
  embeddedSigning?: boolean;
}

export interface BulkSignerListEntry {
  signers: { role: string; name: string; emailAddress: string; pin?: string }[];
  customFields?: { name: string; value: string }[];
}

export interface BulkSendWithTemplateParams {
  templateIds: string[];
  signerList: BulkSignerListEntry[];
  title?: string;
  subject?: string;
  message?: string;
  ccs?: { role: string; emailAddress: string }[];
  metadata?: Record<string, string>;
  signingRedirectUrl?: string;
  testMode?: boolean;
  clientId?: string;
  embeddedSigning?: boolean;
}

export interface UpdateSignatureRequestParams {
  signatureRequestId: string;
  signatureId?: string;
  emailAddress?: string;
  signerName?: string;
  expiresAt?: number;
}

export interface CreateTemplateParams {
  title: string;
  subject?: string;
  message?: string;
  signerRoles: { name: string; order?: number }[];
  ccRoles?: string[];
  fileUrls?: string[];
  metadata?: Record<string, string>;
  testMode?: boolean;
}

let toBuffer = (data: unknown) => {
  if (Buffer.isBuffer(data)) {
    return data;
  }
  if (data instanceof ArrayBuffer) {
    return Buffer.from(data);
  }
  if (ArrayBuffer.isView(data)) {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  }
  if (typeof data === 'string') {
    return Buffer.from(data, 'binary');
  }
  return Buffer.from(data as any);
};

let getHeaderValue = (headers: Record<string, any>, name: string) => {
  let value = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(value)) {
    return value[0];
  }
  return typeof value === 'string' ? value : undefined;
};

let cleanObject = <T extends Record<string, any>>(value: T) => {
  for (let key of Object.keys(value)) {
    if (value[key] === undefined) {
      delete value[key];
    }
  }
  return value;
};

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: ClientConfig) {
    let headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (config.authMethod === 'oauth') {
      headers.Authorization = `Bearer ${config.token}`;
    } else {
      let encoded = btoa(`${config.token}:`);
      headers.Authorization = `Basic ${encoded}`;
    }

    this.axios = createAxios({
      baseURL: 'https://api.hellosign.com/v3',
      headers
    });

    this.axios.interceptors.response.use(
      response => response,
      error => Promise.reject(hellosignApiError(error, 'request'))
    );
  }

  // ---- Account ----

  async getAccount(): Promise<any> {
    let response = await this.axios.get('/account');
    return response.data.account;
  }

  async updateAccount(params: { callbackUrl?: string; locale?: string }): Promise<any> {
    let body: Record<string, any> = {};
    if (params.callbackUrl !== undefined) body.callback_url = params.callbackUrl;
    if (params.locale !== undefined) body.locale = params.locale;

    let response = await this.axios.post('/account/update', body);
    return response.data.account;
  }

  // ---- Signature Requests ----

  async sendSignatureRequest(params: SendSignatureRequestParams): Promise<any> {
    if (params.embeddedSigning && !params.clientId) {
      throw hellosignServiceError('clientId is required for embedded signature requests.');
    }

    let body = cleanObject({
      title: params.title,
      subject: params.subject,
      message: params.message,
      signers: params.signers.map(signer =>
        cleanObject({
          email_address: signer.emailAddress,
          name: signer.name,
          order: signer.order,
          pin: signer.pin,
          sms_phone_number: signer.smsPhoneNumber,
          sms_phone_number_type: signer.smsPhoneNumberType
        })
      ),
      cc_email_addresses: params.ccEmailAddresses,
      file_urls: params.fileUrls,
      metadata: params.metadata,
      allow_decline: params.allowDecline,
      allow_reassign: params.allowReassign,
      use_text_tags: params.useTextTags,
      signing_redirect_url: params.signingRedirectUrl,
      test_mode: params.testMode,
      client_id: params.clientId
    });

    let endpoint = params.embeddedSigning
      ? '/signature_request/create_embedded'
      : '/signature_request/send';
    let response = await this.axios.post(endpoint, body);
    return response.data.signature_request;
  }

  async sendSignatureRequestWithTemplate(params: SendWithTemplateParams): Promise<any> {
    if (params.embeddedSigning && !params.clientId) {
      throw hellosignServiceError(
        'clientId is required for embedded template signature requests.'
      );
    }

    let body = cleanObject({
      title: params.title,
      subject: params.subject,
      message: params.message,
      signing_redirect_url: params.signingRedirectUrl,
      test_mode: params.testMode,
      client_id: params.clientId,
      template_ids: params.templateIds,
      signers: params.signers.map(signer =>
        cleanObject({
          role: signer.role,
          email_address: signer.emailAddress,
          name: signer.name,
          pin: signer.pin
        })
      ),
      ccs: params.ccs?.map(cc => ({
        role: cc.role,
        email_address: cc.emailAddress
      })),
      custom_fields: params.customFields?.map(field => ({
        name: field.name,
        value: field.value
      })),
      metadata: params.metadata
    });

    let endpoint = params.embeddedSigning
      ? '/signature_request/create_embedded_with_template'
      : '/signature_request/send_with_template';
    let response = await this.axios.post(endpoint, body);
    return response.data.signature_request;
  }

  async bulkSendSignatureRequestWithTemplate(
    params: BulkSendWithTemplateParams
  ): Promise<any> {
    if (params.embeddedSigning && !params.clientId) {
      throw hellosignServiceError('clientId is required for embedded bulk sends.');
    }

    let body = cleanObject({
      title: params.title,
      subject: params.subject,
      message: params.message,
      signing_redirect_url: params.signingRedirectUrl,
      test_mode: params.testMode,
      client_id: params.clientId,
      template_ids: params.templateIds,
      signer_list: params.signerList.map(entry =>
        cleanObject({
          signers: entry.signers.map(signer =>
            cleanObject({
              role: signer.role,
              name: signer.name,
              email_address: signer.emailAddress,
              pin: signer.pin
            })
          ),
          custom_fields: entry.customFields?.map(field => ({
            name: field.name,
            value: field.value
          }))
        })
      ),
      ccs: params.ccs?.map(cc => ({
        role: cc.role,
        email_address: cc.emailAddress
      })),
      metadata: params.metadata
    });

    let endpoint = params.embeddedSigning
      ? '/signature_request/bulk_create_embedded_with_template'
      : '/signature_request/bulk_send_with_template';
    let response = await this.axios.post(endpoint, body);
    return response.data.bulk_send_job;
  }

  async releaseOnHoldSignatureRequest(signatureRequestId: string): Promise<any> {
    let response = await this.axios.post(
      `/signature_request/release_hold/${signatureRequestId}`
    );
    return response.data.signature_request;
  }

  async getSignatureRequest(signatureRequestId: string): Promise<any> {
    let response = await this.axios.get(`/signature_request/${signatureRequestId}`);
    return response.data.signature_request;
  }

  async listSignatureRequests(
    params?: ListParams
  ): Promise<{ signatureRequests: any[]; listInfo: ListInfo }> {
    let query: Record<string, any> = {};
    if (params?.page) query.page = params.page;
    if (params?.pageSize) query.page_size = params.pageSize;
    if (params?.query) query.query = params.query;

    let response = await this.axios.get('/signature_request/list', { params: query });
    return {
      signatureRequests: response.data.signature_requests || [],
      listInfo: this.mapListInfo(response.data.list_info)
    };
  }

  async cancelSignatureRequest(signatureRequestId: string): Promise<void> {
    await this.axios.post(`/signature_request/cancel/${signatureRequestId}`);
  }

  async removeSignatureRequest(signatureRequestId: string): Promise<void> {
    await this.axios.post(`/signature_request/remove/${signatureRequestId}`);
  }

  async sendReminder(
    signatureRequestId: string,
    emailAddress: string,
    name?: string
  ): Promise<any> {
    let body: Record<string, any> = {
      email_address: emailAddress
    };
    if (name) body.name = name;

    let response = await this.axios.post(
      `/signature_request/remind/${signatureRequestId}`,
      body
    );
    return response.data.signature_request;
  }

  async updateSignatureRequest(params: UpdateSignatureRequestParams): Promise<any> {
    let body: Record<string, any> = {};
    if (params.signatureId) body.signature_id = params.signatureId;
    if (params.emailAddress) body.email_address = params.emailAddress;
    if (params.signerName) body.signer_name = params.signerName;
    if (params.expiresAt !== undefined) body.expires_at = params.expiresAt;

    let response = await this.axios.post(
      `/signature_request/update/${params.signatureRequestId}`,
      body
    );
    return response.data.signature_request;
  }

  async getSignatureRequestFiles(
    signatureRequestId: string,
    fileType?: 'pdf' | 'zip'
  ): Promise<{ contentBase64: string; mimeType: string; byteLength: number }> {
    let params: Record<string, any> = {};
    if (fileType) params.file_type = fileType;

    let response = await this.axios.get(`/signature_request/files/${signatureRequestId}`, {
      params,
      responseType: 'arraybuffer'
    });
    let content = toBuffer(response.data);
    return {
      contentBase64: content.toString('base64'),
      mimeType:
        getHeaderValue(response.headers as Record<string, any>, 'content-type') ??
        (fileType === 'zip' ? 'application/zip' : 'application/pdf'),
      byteLength: content.byteLength
    };
  }

  // ---- Templates ----

  async getTemplate(templateId: string): Promise<any> {
    let response = await this.axios.get(`/template/${templateId}`);
    return response.data.template;
  }

  async listTemplates(params?: ListParams): Promise<{ templates: any[]; listInfo: ListInfo }> {
    let query: Record<string, any> = {};
    if (params?.page) query.page = params.page;
    if (params?.pageSize) query.page_size = params.pageSize;
    if (params?.query) query.query = params.query;

    let response = await this.axios.get('/template/list', { params: query });
    return {
      templates: response.data.templates || [],
      listInfo: this.mapListInfo(response.data.list_info)
    };
  }

  async updateTemplate(
    templateId: string,
    params: { title?: string; subject?: string; message?: string }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (params.title) body.title = params.title;
    if (params.subject) body.subject = params.subject;
    if (params.message) body.message = params.message;

    let response = await this.axios.post(`/template/update/${templateId}`, body);
    return response.data.template;
  }

  async deleteTemplate(templateId: string): Promise<void> {
    await this.axios.post(`/template/delete/${templateId}`);
  }

  async addTemplateUser(
    templateId: string,
    params: { accountId?: string; emailAddress?: string }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (params.accountId) body.account_id = params.accountId;
    if (params.emailAddress) body.email_address = params.emailAddress;

    let response = await this.axios.post(`/template/add_user/${templateId}`, body);
    return response.data.template;
  }

  async removeTemplateUser(
    templateId: string,
    params: { accountId?: string; emailAddress?: string }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (params.accountId) body.account_id = params.accountId;
    if (params.emailAddress) body.email_address = params.emailAddress;

    let response = await this.axios.post(`/template/remove_user/${templateId}`, body);
    return response.data.template;
  }

  async getTemplateFiles(
    templateId: string,
    fileType?: 'pdf' | 'zip'
  ): Promise<{ contentBase64: string; mimeType: string; byteLength: number }> {
    let params: Record<string, any> = {};
    if (fileType) params.file_type = fileType;

    let response = await this.axios.get(`/template/files/${templateId}`, {
      params,
      responseType: 'arraybuffer'
    });
    let content = toBuffer(response.data);
    return {
      contentBase64: content.toString('base64'),
      mimeType:
        getHeaderValue(response.headers as Record<string, any>, 'content-type') ??
        (fileType === 'zip' ? 'application/zip' : 'application/pdf'),
      byteLength: content.byteLength
    };
  }

  // ---- Team ----

  async getTeam(): Promise<any> {
    let response = await this.axios.get('/team');
    return response.data.team;
  }

  async updateTeam(name: string): Promise<any> {
    let response = await this.axios.post('/team/update', { name });
    return response.data.team;
  }

  async addTeamMember(params: {
    accountId?: string;
    emailAddress?: string;
    role?: string;
  }): Promise<any> {
    let body: Record<string, any> = {};
    if (params.accountId) body.account_id = params.accountId;
    if (params.emailAddress) body.email_address = params.emailAddress;
    if (params.role) body.role = params.role;

    let response = await this.axios.post('/team/add_member', body);
    return response.data.team;
  }

  async removeTeamMember(params: { accountId?: string; emailAddress?: string }): Promise<any> {
    let body: Record<string, any> = {};
    if (params.accountId) body.account_id = params.accountId;
    if (params.emailAddress) body.email_address = params.emailAddress;

    let response = await this.axios.post('/team/remove_member', body);
    return response.data.team;
  }

  // ---- Embedded ----

  async getEmbeddedSignUrl(
    signatureId: string
  ): Promise<{ signUrl: string; expiresAt: number }> {
    let response = await this.axios.get(`/embedded/sign_url/${signatureId}`);
    return {
      signUrl: response.data.embedded.sign_url,
      expiresAt: response.data.embedded.expires_at
    };
  }

  async getEmbeddedEditUrl(
    templateId: string,
    params?: { skipSignerRoles?: boolean; skipSubjectMessage?: boolean }
  ): Promise<{ editUrl: string; expiresAt: number }> {
    let query: Record<string, any> = {};
    if (params?.skipSignerRoles) query.skip_signer_roles = 1;
    if (params?.skipSubjectMessage) query.skip_subject_message = 1;

    let response = await this.axios.get(`/embedded/edit_url/${templateId}`, { params: query });
    return {
      editUrl: response.data.embedded.edit_url,
      expiresAt: response.data.embedded.expires_at
    };
  }

  // ---- Bulk Send ----

  async getBulkSendJob(bulkSendJobId: string, page?: number, pageSize?: number): Promise<any> {
    let params: Record<string, any> = {};
    if (page) params.page = page;
    if (pageSize) params.page_size = pageSize;

    let response = await this.axios.get(`/bulk_send_job/${bulkSendJobId}`, { params });
    return response.data;
  }

  async listBulkSendJobs(
    page?: number,
    pageSize?: number
  ): Promise<{ bulkSendJobs: any[]; listInfo: ListInfo }> {
    let params: Record<string, any> = {};
    if (page) params.page = page;
    if (pageSize) params.page_size = pageSize;

    let response = await this.axios.get('/bulk_send_job/list', { params });
    return {
      bulkSendJobs: response.data.bulk_send_jobs || [],
      listInfo: this.mapListInfo(response.data.list_info)
    };
  }

  // ---- Reports ----

  async createReport(startDate: string, endDate: string, reportType: string[]): Promise<any> {
    let response = await this.axios.post('/report/create', {
      start_date: startDate,
      end_date: endDate,
      report_type: reportType
    });
    return response.data.report ?? response.data;
  }

  // ---- Helpers ----

  private mapListInfo(raw: any): ListInfo {
    return {
      page: raw?.page ?? 1,
      numPages: raw?.num_pages ?? 1,
      numResults: raw?.num_results ?? 0,
      pageSize: raw?.page_size ?? 20
    };
  }
}
