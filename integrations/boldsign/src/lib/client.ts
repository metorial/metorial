import { createAxios } from 'slates';

export type BoldSignRegion = 'us' | 'eu';

let getBaseUrl = (region: BoldSignRegion): string => {
  return region === 'eu' ? 'https://eu-api.boldsign.com' : 'https://api.boldsign.com';
};

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(options: { token: string; region: BoldSignRegion }) {
    this.axios = createAxios({
      baseURL: getBaseUrl(options.region),
      headers: {
        'X-API-KEY': options.token,
        Authorization: `Bearer ${options.token}`
      }
    });
  }

  // ─── Documents ──────────────────────────────────────────

  async sendDocument(params: {
    title?: string;
    message?: string;
    signers: Array<{
      name: string;
      emailAddress: string;
      signerType?: string;
      signerOrder?: number;
      locale?: string;
      privateMessage?: string;
      authenticationCode?: string;
      enableEmailOTP?: boolean;
    }>;
    cc?: Array<{ emailAddress: string }>;
    files?: Array<{ fileName: string; fileContent: string }>; // base64
    fileUrls?: string[];
    brandId?: string;
    labels?: string[];
    expiryDays?: number;
    enableReassign?: boolean;
    enablePrintAndSign?: boolean;
    disableEmails?: boolean;
    disableExpiryAlert?: boolean;
    enableSigningOrder?: boolean;
    onBehalfOf?: string;
    reminderSettings?: {
      reminderDays?: number;
      reminderCount?: number;
    };
  }): Promise<{ documentId: string }> {
    let body: Record<string, any> = {
      Title: params.title,
      Message: params.message,
      Signers: params.signers.map(s => ({
        Name: s.name,
        EmailAddress: s.emailAddress,
        SignerType: s.signerType ?? 'Signer',
        SignerOrder: s.signerOrder,
        Locale: s.locale,
        PrivateMessage: s.privateMessage,
        AuthenticationCode: s.authenticationCode,
        EnableEmailOTP: s.enableEmailOTP
      })),
      CC: params.cc?.map(c => ({ EmailAddress: c.emailAddress })),
      FileUrls: params.fileUrls,
      BrandId: params.brandId,
      Labels: params.labels,
      ExpiryDays: params.expiryDays,
      EnableReassign: params.enableReassign,
      EnablePrintAndSign: params.enablePrintAndSign,
      DisableEmails: params.disableEmails,
      DisableExpiryAlert: params.disableExpiryAlert,
      EnableSigningOrder: params.enableSigningOrder,
      OnBehalfOf: params.onBehalfOf,
      ReminderSettings: params.reminderSettings
        ? {
            ReminderDays: params.reminderSettings.reminderDays,
            ReminderCount: params.reminderSettings.reminderCount
          }
        : undefined
    };

    // Remove undefined values
    body = JSON.parse(JSON.stringify(body));

    let response = await this.axios.post('/v1/document/send', body, {
      headers: { 'Content-Type': 'application/json' }
    });

    return { documentId: response.data.documentId };
  }

  async listDocuments(params: {
    page?: number;
    pageSize?: number;
    status?: string[];
    searchKey?: string;
    sentBy?: string[];
    recipients?: string[];
    labels?: string[];
    startDate?: string;
    endDate?: string;
  }): Promise<{
    pageDetails: {
      pageSize: number;
      currentPage: number;
      totalRecordsCount: number;
      totalPages: number;
    };
    result: Record<string, any>[];
  }> {
    let queryParams = new URLSearchParams();

    if (params.page) queryParams.set('page', String(params.page));
    if (params.pageSize) queryParams.set('pageSize', String(params.pageSize));
    if (params.searchKey) queryParams.set('searchKey', params.searchKey);
    if (params.startDate) queryParams.set('startDate', params.startDate);
    if (params.endDate) queryParams.set('endDate', params.endDate);

    params.status?.forEach(s => queryParams.append('status', s));
    params.sentBy?.forEach(s => queryParams.append('sentBy', s));
    params.recipients?.forEach(s => queryParams.append('recipients', s));
    params.labels?.forEach(l => queryParams.append('labels', l));

    let response = await this.axios.get(`/v1/document/list?${queryParams.toString()}`);
    return response.data;
  }

  async getDocument(documentId: string): Promise<Record<string, any>> {
    let response = await this.axios.get('/v1/document/properties', {
      params: { documentId }
    });
    return response.data;
  }

  async revokeDocument(
    documentId: string,
    message: string,
    onBehalfOf?: string
  ): Promise<void> {
    let body: Record<string, any> = { message };
    if (onBehalfOf) body.onBehalfOf = onBehalfOf;

    await this.axios.post(
      `/v1/document/revoke?documentId=${encodeURIComponent(documentId)}`,
      body,
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  async remindDocument(
    documentId: string,
    message?: string,
    onBehalfOf?: string
  ): Promise<void> {
    let body: Record<string, any> = {};
    if (message) body.Message = message;
    if (onBehalfOf) body.OnBehalfOf = onBehalfOf;

    await this.axios.post(
      `/v1/document/remind?documentId=${encodeURIComponent(documentId)}`,
      body,
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  async deleteDocument(documentId: string): Promise<void> {
    await this.axios.delete(`/v1/document/delete`, {
      params: { documentId }
    });
  }

  async downloadDocument(
    documentId: string,
    onBehalfOf?: string
  ): Promise<{ downloadUrl: string }> {
    let params: Record<string, string> = { documentId };
    if (onBehalfOf) params.onBehalfOf = onBehalfOf;

    let response = await this.axios.get('/v1/document/download', {
      params,
      responseType: 'arraybuffer'
    });

    let base64 = Buffer.from(response.data).toString('base64');
    return { downloadUrl: `data:application/pdf;base64,${base64}` };
  }

  async downloadAuditLog(
    documentId: string,
    onBehalfOf?: string
  ): Promise<{ downloadUrl: string }> {
    let params: Record<string, string> = { documentId };
    if (onBehalfOf) params.onBehalfOf = onBehalfOf;

    let response = await this.axios.get('/v1/document/downloadAuditLog', {
      params,
      responseType: 'arraybuffer'
    });

    let base64 = Buffer.from(response.data).toString('base64');
    return { downloadUrl: `data:application/pdf;base64,${base64}` };
  }

  // ─── Templates ──────────────────────────────────────────

  async listTemplates(params: {
    page?: number;
    pageSize?: number;
    templateType?: string;
    searchKey?: string;
    createdBy?: string[];
    templateLabels?: string[];
    brandIds?: string[];
  }): Promise<{
    pageDetails: {
      pageSize: number;
      page: number;
      totalRecordsCount: number;
      totalPages: number;
    };
    result: Record<string, any>[];
  }> {
    let queryParams = new URLSearchParams();

    if (params.page) queryParams.set('page', String(params.page));
    if (params.pageSize) queryParams.set('pageSize', String(params.pageSize));
    if (params.templateType) queryParams.set('templateType', params.templateType);
    if (params.searchKey) queryParams.set('searchKey', params.searchKey);

    params.createdBy?.forEach(s => queryParams.append('createdBy', s));
    params.templateLabels?.forEach(s => queryParams.append('templateLabels', s));
    params.brandIds?.forEach(s => queryParams.append('brandIds', s));

    let response = await this.axios.get(`/v1/template/list?${queryParams.toString()}`);
    return response.data;
  }

  async getTemplate(templateId: string): Promise<Record<string, any>> {
    let response = await this.axios.get('/v1/template/properties', {
      params: { templateId }
    });
    return response.data;
  }

  async sendFromTemplate(params: {
    templateId: string;
    title?: string;
    message?: string;
    roles: Array<{
      roleIndex: number;
      signerName: string;
      signerEmail: string;
      signerType?: string;
      signerOrder?: number;
      locale?: string;
      privateMessage?: string;
    }>;
    cc?: Array<{ emailAddress: string }>;
    brandId?: string;
    labels?: string[];
    expiryDays?: number;
    enableReassign?: boolean;
    enablePrintAndSign?: boolean;
    disableEmails?: boolean;
    onBehalfOf?: string;
    reminderSettings?: {
      reminderDays?: number;
      reminderCount?: number;
    };
  }): Promise<{ documentId: string }> {
    let body: Record<string, any> = {
      Title: params.title,
      Message: params.message,
      Roles: params.roles.map(r => ({
        RoleIndex: r.roleIndex,
        SignerName: r.signerName,
        SignerEmail: r.signerEmail,
        SignerType: r.signerType ?? 'Signer',
        SignerOrder: r.signerOrder,
        Locale: r.locale,
        PrivateMessage: r.privateMessage
      })),
      CC: params.cc?.map(c => ({ EmailAddress: c.emailAddress })),
      BrandId: params.brandId,
      Labels: params.labels,
      ExpiryDays: params.expiryDays,
      EnableReassign: params.enableReassign,
      EnablePrintAndSign: params.enablePrintAndSign,
      DisableEmails: params.disableEmails,
      OnBehalfOf: params.onBehalfOf,
      ReminderSettings: params.reminderSettings
        ? {
            ReminderDays: params.reminderSettings.reminderDays,
            ReminderCount: params.reminderSettings.reminderCount
          }
        : undefined
    };

    body = JSON.parse(JSON.stringify(body));

    let response = await this.axios.post(
      `/v1/template/send?templateId=${encodeURIComponent(params.templateId)}`,
      body,
      { headers: { 'Content-Type': 'application/json' } }
    );

    return { documentId: response.data.documentId };
  }

  async deleteTemplate(templateId: string): Promise<void> {
    await this.axios.delete('/v1/template/delete', {
      params: { templateId }
    });
  }

  // ─── Users ──────────────────────────────────────────────

  async listUsers(params: { page?: number; pageSize?: number; searchKey?: string }): Promise<{
    pageDetails: Record<string, any>;
    result: Record<string, any>[];
  }> {
    let response = await this.axios.get('/v1/users/list', {
      params: {
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 10,
        searchKey: params.searchKey
      }
    });
    return response.data;
  }

  async getUser(userId: string): Promise<Record<string, any>> {
    let response = await this.axios.get('/v1/users/get', {
      params: { userId }
    });
    return response.data;
  }

  // ─── Teams ──────────────────────────────────────────────

  async listTeams(params: { page?: number; pageSize?: number; searchKey?: string }): Promise<{
    pageDetails: Record<string, any>;
    result: Record<string, any>[];
  }> {
    let response = await this.axios.get('/v1/teams/list', {
      params: {
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 10,
        searchKey: params.searchKey
      }
    });
    return response.data;
  }

  // ─── Brands ─────────────────────────────────────────────

  async listBrands(): Promise<{ result: Record<string, any>[] }> {
    let response = await this.axios.get('/v1/brand/list');
    return response.data;
  }

  // ─── Sender Identities ─────────────────────────────────

  async listSenderIdentities(params: { page?: number; pageSize?: number }): Promise<{
    pageDetails: Record<string, any>;
    result: Record<string, any>[];
  }> {
    let response = await this.axios.get('/v1/senderIdentities/list', {
      params: {
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 10
      }
    });
    return response.data;
  }

  async createSenderIdentity(params: {
    name: string;
    email: string;
    notificationSettings?: Record<string, any>;
  }): Promise<Record<string, any>> {
    let response = await this.axios.post('/v1/senderIdentities/create', params, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  }

  // ─── Contacts ───────────────────────────────────────────

  async listContacts(params: {
    page?: number;
    pageSize?: number;
    searchKey?: string;
  }): Promise<{
    pageDetails: Record<string, any>;
    result: Record<string, any>[];
  }> {
    let response = await this.axios.get('/v1/contacts/list', {
      params: {
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 10,
        searchKey: params.searchKey
      }
    });
    return response.data;
  }

  // ─── Embedded Signing ───────────────────────────────────

  async getEmbeddedSignLink(params: {
    documentId: string;
    signerEmail: string;
    redirectUrl?: string;
  }): Promise<{ signLink: string }> {
    let response = await this.axios.get('/v1/document/getEmbeddedSignLink', {
      params: {
        documentId: params.documentId,
        signerEmail: params.signerEmail,
        redirectUrl: params.redirectUrl
      }
    });
    return response.data;
  }
}
