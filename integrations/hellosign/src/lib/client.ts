import { createAxios } from 'slates';

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

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: ClientConfig) {
    let headers: Record<string, string> = {};

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
    let body: Record<string, any> = {};

    if (params.title) body.title = params.title;
    if (params.subject) body.subject = params.subject;
    if (params.message) body.message = params.message;
    if (params.allowDecline) body.allow_decline = 1;
    if (params.allowReassign) body.allow_reassign = 1;
    if (params.useTextTags) body.use_text_tags = 1;
    if (params.signingRedirectUrl) body.signing_redirect_url = params.signingRedirectUrl;
    if (params.testMode) body.test_mode = 1;
    if (params.clientId) body.client_id = params.clientId;

    params.signers.forEach((signer, i) => {
      body[`signers[${i}][email_address]`] = signer.emailAddress;
      body[`signers[${i}][name]`] = signer.name;
      if (signer.order !== undefined) body[`signers[${i}][order]`] = signer.order;
      if (signer.pin) body[`signers[${i}][pin]`] = signer.pin;
      if (signer.smsPhoneNumber)
        body[`signers[${i}][sms_phone_number]`] = signer.smsPhoneNumber;
      if (signer.smsPhoneNumberType)
        body[`signers[${i}][sms_phone_number_type]`] = signer.smsPhoneNumberType;
    });

    if (params.ccEmailAddresses) {
      params.ccEmailAddresses.forEach((email, i) => {
        body[`cc_email_addresses[${i}]`] = email;
      });
    }

    if (params.fileUrls) {
      params.fileUrls.forEach((url, i) => {
        body[`file_url[${i}]`] = url;
      });
    }

    if (params.metadata) {
      for (let [key, value] of Object.entries(params.metadata)) {
        body[`metadata[${key}]`] = value;
      }
    }

    let response = await this.axios.post('/signature_request/send', body);
    return response.data.signature_request;
  }

  async sendSignatureRequestWithTemplate(params: SendWithTemplateParams): Promise<any> {
    let body: Record<string, any> = {};

    if (params.title) body.title = params.title;
    if (params.subject) body.subject = params.subject;
    if (params.message) body.message = params.message;
    if (params.signingRedirectUrl) body.signing_redirect_url = params.signingRedirectUrl;
    if (params.testMode) body.test_mode = 1;
    if (params.clientId) body.client_id = params.clientId;

    params.templateIds.forEach((id, i) => {
      body[`template_ids[${i}]`] = id;
    });

    params.signers.forEach((signer, _i) => {
      body[`signers[${signer.role}][email_address]`] = signer.emailAddress;
      body[`signers[${signer.role}][name]`] = signer.name;
      if (signer.pin) body[`signers[${signer.role}][pin]`] = signer.pin;
    });

    if (params.ccs) {
      params.ccs.forEach(cc => {
        body[`ccs[${cc.role}][email_address]`] = cc.emailAddress;
      });
    }

    if (params.customFields) {
      params.customFields.forEach((field, i) => {
        body[`custom_fields[${i}][name]`] = field.name;
        body[`custom_fields[${i}][value]`] = field.value;
      });
    }

    if (params.metadata) {
      for (let [key, value] of Object.entries(params.metadata)) {
        body[`metadata[${key}]`] = value;
      }
    }

    let response = await this.axios.post('/signature_request/send_with_template', body);
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
    if (params.expiresAt) body.expires_at = params.expiresAt;

    let response = await this.axios.post(
      `/signature_request/update/${params.signatureRequestId}`,
      body
    );
    return response.data.signature_request;
  }

  async getSignatureRequestFiles(
    signatureRequestId: string,
    fileType?: 'pdf' | 'zip'
  ): Promise<{ fileUrl: string }> {
    let params: Record<string, any> = { get_url: true };
    if (fileType) params.file_type = fileType;

    let response = await this.axios.get(`/signature_request/files/${signatureRequestId}`, {
      params
    });
    return { fileUrl: response.data.file_url };
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
  ): Promise<{ fileUrl: string }> {
    let params: Record<string, any> = { get_url: true };
    if (fileType) params.file_type = fileType;

    let response = await this.axios.get(`/template/files/${templateId}`, { params });
    return { fileUrl: response.data.file_url };
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
    return response.data;
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
