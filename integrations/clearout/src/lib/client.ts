import { createAxios } from 'slates';

export class ClearoutClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string; baseUrl: string }) {
    this.axios = createAxios({
      baseURL: config.baseUrl,
      headers: {
        Authorization: config.token,
        'Content-Type': 'application/json'
      }
    });
  }

  // ──────────────────────────────────────────
  // Email Verification
  // ──────────────────────────────────────────

  async verifyEmail(params: {
    email: string;
    timeout?: number;
  }): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = { email: params.email };
    if (params.timeout !== undefined) body.timeout = params.timeout;
    let response = await this.axios.post('/v2/email_verify/instant', body);
    return response.data;
  }

  async bulkVerifyUpload(params: {
    fileContent: string;
    fileName: string;
    ignoreDuplicateFile?: boolean;
  }): Promise<Record<string, unknown>> {
    let boundary = `----SlatesBoundary${Date.now()}`;
    let bodyParts: string[] = [];

    bodyParts.push(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${params.fileName}"\r\nContent-Type: application/octet-stream\r\n\r\n${params.fileContent}\r\n`
    );

    if (params.ignoreDuplicateFile !== undefined) {
      bodyParts.push(
        `--${boundary}\r\nContent-Disposition: form-data; name="ignore_duplicate_file"\r\n\r\n${params.ignoreDuplicateFile}\r\n`
      );
    }

    bodyParts.push(`--${boundary}--\r\n`);

    let response = await this.axios.post('/v2/email_verify/bulk', bodyParts.join(''), {
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      }
    });
    return response.data;
  }

  async bulkVerifyProgress(listId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get('/v2/email_verify/bulk/progress_status', {
      params: { list_id: listId }
    });
    return response.data;
  }

  async downloadResult(listId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/v2/download/result', { list_id: listId });
    return response.data;
  }

  async cancelVerifyList(listId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/v2/email_verify/list/cancel', { list_id: listId });
    return response.data;
  }

  async removeVerifyList(listId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/v2/email_verify/list/remove', { list_id: listId });
    return response.data;
  }

  // ──────────────────────────────────────────
  // Email Finder
  // ──────────────────────────────────────────

  async findEmail(params: {
    name: string;
    domain: string;
    timeout?: number;
  }): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = {
      name: params.name,
      domain: params.domain
    };
    if (params.timeout !== undefined) body.timeout = params.timeout;
    let response = await this.axios.post('/v2/email_finder/instant', body);
    return response.data;
  }

  async findEmailQueueStatus(queueId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get('/v2/email_finder/instant/queue_status', {
      params: { qid: queueId }
    });
    return response.data;
  }

  async bulkFinderUpload(params: {
    fileContent: string;
    fileName: string;
    ignoreDuplicateFile?: boolean;
  }): Promise<Record<string, unknown>> {
    let boundary = `----SlatesBoundary${Date.now()}`;
    let bodyParts: string[] = [];

    bodyParts.push(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${params.fileName}"\r\nContent-Type: application/octet-stream\r\n\r\n${params.fileContent}\r\n`
    );

    if (params.ignoreDuplicateFile !== undefined) {
      bodyParts.push(
        `--${boundary}\r\nContent-Disposition: form-data; name="ignore_duplicate_file"\r\n\r\n${params.ignoreDuplicateFile}\r\n`
      );
    }

    bodyParts.push(`--${boundary}--\r\n`);

    let response = await this.axios.post('/v2/email_finder/bulk', bodyParts.join(''), {
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      }
    });
    return response.data;
  }

  async bulkFinderProgress(listId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get('/v2/email_finder/bulk/progress_status', {
      params: { list_id: listId }
    });
    return response.data;
  }

  async downloadFinderResult(listId: string): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/v2/email_finder/download/result', {
      list_id: listId
    });
    return response.data;
  }

  // ──────────────────────────────────────────
  // Reverse Lookup
  // ──────────────────────────────────────────

  async reverseLookupLinkedIn(linkedinUrl: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get('/v2/reverse_lookup/linkedin', {
      params: { url: linkedinUrl }
    });
    return response.data;
  }

  async reverseLookupEmail(emailAddress: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get('/v2/reverse_lookup/email', {
      params: { email_address: emailAddress }
    });
    return response.data;
  }

  async reverseLookupDomain(domain: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get('/v2/reverse_lookup/domain', {
      params: { name: domain }
    });
    return response.data;
  }

  // ──────────────────────────────────────────
  // Domain Utilities
  // ──────────────────────────────────────────

  async mxLookup(domain: string): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/v2/domain/resolve/mx', { domain });
    return response.data;
  }

  async whoisLookup(domain: string): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/v2/domain/resolve/whois', { domain });
    return response.data;
  }

  // ──────────────────────────────────────────
  // Autocomplete (Company to Domain)
  // ──────────────────────────────────────────

  async autocompleteCompany(query: string): Promise<Record<string, unknown>> {
    let response = await this.axios.get('/public/companies/autocomplete', {
      params: { query }
    });
    return response.data;
  }

  // ──────────────────────────────────────────
  // Credits
  // ──────────────────────────────────────────

  async getCredits(): Promise<Record<string, unknown>> {
    let response = await this.axios.get('/v2/email_verify/getcredits');
    return response.data;
  }
}
