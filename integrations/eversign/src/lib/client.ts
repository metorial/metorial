import { createAxios } from 'slates';

export interface ClientConfig {
  token: string;
  businessId: string;
  sandbox?: boolean;
  isOauth?: boolean;
}

export class Client {
  private axios: ReturnType<typeof createAxios>;
  private businessId: string;
  private sandbox: boolean;
  private isOauth: boolean;
  private token: string;

  constructor(config: ClientConfig) {
    this.businessId = config.businessId;
    this.sandbox = config.sandbox ?? false;
    this.isOauth = config.isOauth ?? false;
    this.token = config.token;

    let headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (this.isOauth) {
      headers.Authorization = `Bearer ${config.token}`;
    }

    this.axios = createAxios({
      baseURL: 'https://api.eversign.com',
      headers
    });
  }

  private getParams(
    extra: Record<string, string | number> = {}
  ): Record<string, string | number> {
    let params: Record<string, string | number> = {
      business_id: this.businessId,
      ...extra
    };
    if (!this.isOauth) {
      params.access_key = this.token;
    }
    return params;
  }

  // ==================== Business ====================

  async listBusinesses(): Promise<any[]> {
    let params: Record<string, string> = {};
    if (!this.isOauth) {
      params.access_key = this.token;
    }
    let response = await this.axios.get('/business', { params });
    return response.data;
  }

  // ==================== Documents ====================

  async createDocument(body: Record<string, any>): Promise<any> {
    if (this.sandbox) {
      body.sandbox = 1;
    }
    let response = await this.axios.post('/document', body, {
      params: this.getParams()
    });
    return response.data;
  }

  async getDocument(documentHash: string): Promise<any> {
    let response = await this.axios.get('/document', {
      params: this.getParams({ document_hash: documentHash })
    });
    return response.data;
  }

  async listDocuments(type: string, page?: number, limit?: number): Promise<any[]> {
    let extra: Record<string, string | number> = { type };
    if (page !== undefined) extra.page = page;
    if (limit !== undefined) extra.limit = limit;
    let response = await this.axios.get('/document', {
      params: this.getParams(extra)
    });
    return response.data;
  }

  async cancelDocument(documentHash: string): Promise<any> {
    let response = await this.axios.delete('/document', {
      params: this.getParams({ document_hash: documentHash, cancel: 1 })
    });
    return response.data;
  }

  async trashDocument(documentHash: string): Promise<any> {
    let response = await this.axios.delete('/document', {
      params: this.getParams({ document_hash: documentHash, trash: 1 })
    });
    return response.data;
  }

  async deleteDocument(documentHash: string): Promise<any> {
    let response = await this.axios.delete('/document', {
      params: this.getParams({ document_hash: documentHash })
    });
    return response.data;
  }

  // ==================== Templates ====================

  async createTemplate(body: Record<string, any>): Promise<any> {
    body.is_template = 1;
    if (this.sandbox) {
      body.sandbox = 1;
    }
    let response = await this.axios.post('/document', body, {
      params: this.getParams()
    });
    return response.data;
  }

  async listTemplates(
    type: string = 'templates',
    page?: number,
    limit?: number
  ): Promise<any[]> {
    let extra: Record<string, string | number> = { type };
    if (page !== undefined) extra.page = page;
    if (limit !== undefined) extra.limit = limit;
    let response = await this.axios.get('/document', {
      params: this.getParams(extra)
    });
    return response.data;
  }

  async createDocumentFromTemplate(body: Record<string, any>): Promise<any> {
    if (this.sandbox) {
      body.sandbox = 1;
    }
    let response = await this.axios.post('/document', body, {
      params: this.getParams()
    });
    return response.data;
  }

  // ==================== Signer Management ====================

  async sendReminder(documentHash: string, signerId: number): Promise<any> {
    let response = await this.axios.post(
      '/send_reminder',
      {
        document_hash: documentHash,
        signer_id: signerId
      },
      {
        params: this.getParams()
      }
    );
    return response.data;
  }

  async reassignSigner(
    documentHash: string,
    signerId: number,
    newSignerName: string,
    newSignerEmail: string,
    reason?: string
  ): Promise<any> {
    let body: Record<string, any> = {
      document_hash: documentHash,
      signer_id: signerId,
      new_signer_name: newSignerName,
      new_signer_email: newSignerEmail
    };
    if (reason) {
      body.reason = reason;
    }
    let response = await this.axios.post('/reassign', body, {
      params: this.getParams()
    });
    return response.data;
  }

  // ==================== File Management ====================

  async uploadFile(fileContent: string, fileName: string): Promise<any> {
    let boundary = `----SlatesBoundary${Date.now().toString(36)}`;
    let body = `--${boundary}\r\nContent-Disposition: form-data; name="upload"; filename="${fileName}"\r\nContent-Type: application/octet-stream\r\n\r\n${fileContent}\r\n--${boundary}--`;

    let response = await this.axios.post('/file', body, {
      params: this.getParams(),
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      }
    });
    return response.data;
  }

  // ==================== Document Download ====================

  async getDownloadUrl(
    documentHash: string,
    type: 'raw' | 'final',
    auditTrail?: boolean
  ): Promise<string> {
    let endpoint = type === 'raw' ? '/download_raw_document' : '/download_final_document';
    let extra: Record<string, string | number> = {
      document_hash: documentHash,
      url_only: 1
    };
    if (type === 'final' && auditTrail) {
      extra.audit_trail = 1;
    }
    let response = await this.axios.get(endpoint, {
      params: this.getParams(extra)
    });
    return response.data;
  }

  // ==================== Bulk Sending ====================

  async getBulkCsvTemplate(templateHash: string): Promise<string> {
    let response = await this.axios.get(`/template/${templateHash}/bulk/csv/blank`, {
      params: this.getParams()
    });
    return response.data;
  }

  async createBulkJob(templateHash: string, csvData: any[][]): Promise<any> {
    let response = await this.axios.post(`/template/${templateHash}/bulk/job`, csvData, {
      params: this.getParams()
    });
    return response.data;
  }

  async getBulkJob(bulkJobId: string): Promise<any> {
    let response = await this.axios.get(`/bulk_job/${bulkJobId}`, {
      params: this.getParams()
    });
    return response.data;
  }

  async getBulkJobStatus(bulkJobId: string): Promise<any> {
    let response = await this.axios.get(`/bulk_job/${bulkJobId}/status`, {
      params: this.getParams()
    });
    return response.data;
  }

  async getBulkJobDocuments(bulkJobId: string, limit?: number, offset?: number): Promise<any> {
    let extra: Record<string, string | number> = {};
    if (limit !== undefined) extra.limit = limit;
    if (offset !== undefined) extra.offset = offset;
    let response = await this.axios.get(`/bulk_job/${bulkJobId}/documents`, {
      params: this.getParams(extra)
    });
    return response.data;
  }

  async listBulkJobs(limit?: number, offset?: number): Promise<any> {
    let extra: Record<string, string | number> = {};
    if (limit !== undefined) extra.limit = limit;
    if (offset !== undefined) extra.offset = offset;
    let response = await this.axios.get('/bulk_job', {
      params: this.getParams(extra)
    });
    return response.data;
  }
}
