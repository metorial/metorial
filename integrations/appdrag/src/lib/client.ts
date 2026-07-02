import { createAxios } from 'slates';

export class AppDragClient {
  private apiKey: string;
  private appId: string;

  constructor(opts: { apiKey: string; appId: string }) {
    this.apiKey = opts.apiKey;
    this.appId = opts.appId;
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
    return this.backendCommand('NewslettersInsertContactsIntoLists', {
      listsToAdd: opts.listsToAdd,
      contactsMail: opts.contactsMail,
      contactsFirstName: opts.contactsFirstName,
      contactsLastName: opts.contactsLastName
    });
  }

  async newsletterDeleteLists(listsToDelete: string): Promise<any> {
    return this.backendCommand('NewslettersDeleteLists', { listsToDelete });
  }

  async newsletterDeleteContacts(opts: {
    listsToDelete: string;
    contactsMail: string;
  }): Promise<any> {
    return this.backendCommand('NewslettersDeleteContactsFromLists', {
      listsToDelete: opts.listsToDelete,
      contactsMail: opts.contactsMail
    });
  }

  async newsletterGetFailedMail(fromDate?: string): Promise<any> {
    let params: Record<string, string> = {};
    if (fromDate) {
      params.fromDate = fromDate;
    }
    return this.backendCommand('NewslettersGetFailedMail', params);
  }

  // ───── Cloud Functions ─────

  async executeFunction(opts: {
    path: string;
    method: string;
    data?: Record<string, any>;
  }): Promise<any> {
    let url = `https://${this.appId}.appdrag.site/api${opts.path}`;

    let authData: Record<string, string> = {
      APIKey: this.apiKey,
      appID: this.appId
    };

    let ax = createAxios({});

    if (opts.method.toUpperCase() === 'GET') {
      let response = await ax.get(url, {
        params: { ...authData, ...(opts.data || {}) },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      return response.data;
    } else {
      let body = new URLSearchParams({ ...authData, ...(opts.data || {}) } as Record<
        string,
        string
      >).toString();
      let response = await ax({
        method: opts.method.toUpperCase(),
        url,
        data: body,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      return response.data;
    }
  }

  // ───── Private Helpers ─────

  private async backendCommand(command: string, params: Record<string, string>): Promise<any> {
    let ax = createAxios({
      baseURL: 'https://api.appdrag.com'
    });

    let body = new URLSearchParams({
      command,
      APIKey: this.apiKey,
      appID: this.appId,
      ...params
    }).toString();

    let response = await ax.post('/CloudBackend.aspx', body, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    return response.data;
  }
}
