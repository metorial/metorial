import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  getApiErrorStatus,
  isApiErrorRecord,
  requestAxiosData
} from 'slates';

export class AppDragClient {
  private apiKey: string;
  private appId: string;
  private axios = createAxios({
    baseURL: 'https://api.appdrag.com',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 60000,
    maxRedirects: 0
  });

  constructor(opts: { apiKey: string; appId: string }) {
    this.apiKey = opts.apiKey;
    this.appId = opts.appId.trim();
    if (!this.apiKey.trim()) {
      throw createApiServiceError(
        'An AppDrag API key is required. Reconnect with your API key.',
        {
          reason: 'missing_credentials'
        }
      );
    }
    if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/.test(this.appId)) {
      throw createApiServiceError(
        'App ID must be the project subdomain from your AppDrag project URL, without a domain or path.',
        { reason: 'invalid_configuration' }
      );
    }
  }

  // ───── Cloud Database ─────

  async sqlSelect(query: string): Promise<any> {
    return this.backendCommand('CloudDBGetDataset', { query });
  }

  async sqlExecuteRawQuery(query: string): Promise<any> {
    return this.backendCommand('CloudDBExecuteRawQuery', { query });
  }

  // ───── Email ─────

  async sendEmail(opts: {
    from: string;
    sender: string;
    to: string;
    subject: string;
    content: string;
    isHtml: boolean;
  }): Promise<any> {
    return this.backendCommand('CloudAPISendEmail', {
      from: opts.from,
      sender: opts.sender,
      to: opts.to,
      subject: opts.subject,
      content: opts.content,
      isHtml: opts.isHtml ? '1' : '0'
    });
  }

  // ───── File Operations ─────

  async fileTextWrite(filekey: string, content: string): Promise<any> {
    return this.backendCommand('WriteTextFile', { filekey, content });
  }

  async fileDelete(filekey: string): Promise<any> {
    return this.backendCommand('FileDelete', { filekey });
  }

  async fileRename(filekey: string, destkey: string): Promise<any> {
    return this.backendCommand('FileRename', { filekey, destkey });
  }

  async fileCopy(filekey: string, destkey: string): Promise<any> {
    return this.backendCommand('FileCopy', { filekey, destkey });
  }

  async downloadRemoteFile(url: string, filekey: string): Promise<any> {
    return this.backendCommand('DownloadRemoteFile', { url, filekey });
  }

  // ───── Directory Operations ─────

  async directoryCreate(directory: string): Promise<any> {
    return this.backendCommand('DirectoryCreate', { directory });
  }

  async directoryList(directory: string): Promise<any> {
    return this.backendCommand('DirectoryList', { directory });
  }

  async directoryRename(directory: string, destDirectory: string): Promise<any> {
    return this.backendCommand('DirectoryRename', { directory, destDirectory });
  }

  async directoryDelete(directory: string): Promise<any> {
    return this.backendCommand('DirectoryDelete', { directory });
  }

  // ───── Newsletter ─────

  async newsletterInsertContacts(opts: {
    listsToAdd: string;
    contactsMail: string;
    contactsFirstName: string;
    contactsLastName: string;
  }): Promise<any> {
    return this.backendCommand(
      'NewslettersInsertContactsIntoLists',
      {
        listsToAdd: opts.listsToAdd,
        contactsMail: opts.contactsMail,
        contactsFirstName: opts.contactsFirstName,
        contactsLastName: opts.contactsLastName
      },
      '/Zapier.aspx'
    );
  }

  async newsletterDeleteLists(listsToDelete: string): Promise<any> {
    return this.backendCommand('NewslettersDeleteLists', { listsToDelete }, '/Zapier.aspx');
  }

  async newsletterDeleteContacts(opts: {
    listsToDelete: string;
    contactsMail: string;
  }): Promise<any> {
    return this.backendCommand(
      'NewslettersDeleteContactsFromLists',
      {
        listsToDelete: opts.listsToDelete,
        contactsMail: opts.contactsMail
      },
      '/Zapier.aspx'
    );
  }

  async newsletterGetFailedMail(fromDate?: string): Promise<any> {
    return this.backendCommand(
      'NewslettersGetFailedMail',
      { fromDate: fromDate ?? '' },
      '/Zapier.aspx'
    );
  }

  // ───── Cloud Functions ─────

  async executeFunction(opts: {
    path: string;
    method: string;
    data?: Record<string, string>;
  }): Promise<any> {
    let path = opts.path.trim().replace(/^\/+/, '');
    if (
      !path ||
      /[?#\\]/.test(path) ||
      path.split('/').some(segment => /^(?:\.|%2e){1,2}$/i.test(segment))
    ) {
      throw createApiServiceError(
        'Provide a function path such as "/users/get-user", without query parameters, fragments, or parent-directory segments.',
        { reason: 'invalid_function_path' }
      );
    }
    let url = `https://${this.appId}.appdrag.site/api/${path}`;

    let authData: Record<string, string> = {
      ...opts.data,
      APIKey: this.apiKey,
      appID: this.appId
    };

    if (opts.method.toUpperCase() === 'GET') {
      return requestAxiosData(
        'execute API function',
        () => this.axios.get(url, { params: authData }),
        this.mapError
      );
    } else {
      let body = new URLSearchParams(authData).toString();
      return requestAxiosData(
        'execute API function',
        () => this.axios({ method: opts.method.toUpperCase(), url, data: body }),
        this.mapError
      );
    }
  }

  // ───── Private Helpers ─────

  private async backendCommand(
    command: string,
    params: Record<string, string>,
    endpoint: '/CloudBackend.aspx' | '/Zapier.aspx' = '/CloudBackend.aspx'
  ): Promise<any> {
    let body = new URLSearchParams({
      command,
      APIKey: this.apiKey,
      appID: this.appId,
      ...params
    }).toString();

    return requestAxiosData(command, () => this.axios.post(endpoint, body), this.mapError);
  }

  private mapError = (error: unknown, operation: string) =>
    buildApiServiceError(error, {
      providerLabel: 'AppDrag',
      reason: 'appdrag_api_error',
      operation,
      extractStatus: () => {
        let status = getApiErrorStatus(error);
        if (status !== undefined) return status;
        let normalizedStatus =
          isApiErrorRecord(error) && isApiErrorRecord(error.data)
            ? error.data.upstreamStatus
            : undefined;
        return typeof normalizedStatus === 'number' || typeof normalizedStatus === 'string'
          ? normalizedStatus
          : undefined;
      }
    });
}
