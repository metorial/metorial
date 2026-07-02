import { createAxios } from 'slates';

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string; domain: string }) {
    this.axios = createAxios({
      baseURL: `https://mail.${config.domain}/api`,
      headers: {
        Authorization: `Zoho-oauthtoken ${config.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });
  }

  // === Accounts ===

  async getAccounts(): Promise<any[]> {
    let response = await this.axios.get('/accounts');
    return response.data?.data || [];
  }

  async getAccount(accountId: string): Promise<any> {
    let response = await this.axios.get(`/accounts/${accountId}`);
    return response.data?.data;
  }

  // === Folders ===

  async listFolders(accountId: string): Promise<any[]> {
    let response = await this.axios.get(`/accounts/${accountId}/folders`);
    return response.data?.data || [];
  }

  async createFolder(
    accountId: string,
    folderName: string,
    parentFolderId?: string
  ): Promise<any> {
    let body: any = { folderName };
    if (parentFolderId) {
      body.parentFolderId = parentFolderId;
    }
    let response = await this.axios.post(`/accounts/${accountId}/folders`, body);
    return response.data?.data;
  }

  async renameFolder(accountId: string, folderId: string, folderName: string): Promise<any> {
    let response = await this.axios.put(`/accounts/${accountId}/folders/${folderId}`, {
      mode: 'rename',
      folderName
    });
    return response.data?.data;
  }

  async deleteFolder(accountId: string, folderId: string): Promise<any> {
    let response = await this.axios.delete(`/accounts/${accountId}/folders/${folderId}`);
    return response.data;
  }

  async emptyFolder(accountId: string, folderId: string): Promise<any> {
    let response = await this.axios.put(`/accounts/${accountId}/folders/${folderId}`, {
      mode: 'emptyFolder'
    });
    return response.data;
  }

  async markFolderAsRead(accountId: string, folderId: string): Promise<any> {
    let response = await this.axios.put(`/accounts/${accountId}/folders/${folderId}`, {
      mode: 'markAsRead'
    });
    return response.data;
  }

  // === Labels ===

  async listLabels(accountId: string): Promise<any[]> {
    let response = await this.axios.get(`/accounts/${accountId}/labels`);
    return response.data?.data || [];
  }

  async createLabel(accountId: string, labelName: string, color?: string): Promise<any> {
    let body: any = { labelName };
    if (color) {
      body.color = color;
    }
    let response = await this.axios.post(`/accounts/${accountId}/labels`, body);
    return response.data?.data;
  }

  async updateLabel(
    accountId: string,
    labelId: string,
    labelName: string,
    color?: string
  ): Promise<any> {
    let body: any = { labelName };
    if (color) {
      body.color = color;
    }
    let response = await this.axios.put(`/accounts/${accountId}/labels/${labelId}`, body);
    return response.data?.data;
  }

  async deleteLabel(accountId: string, labelId: string): Promise<any> {
    let response = await this.axios.delete(`/accounts/${accountId}/labels/${labelId}`);
    return response.data;
  }

  // === Messages ===

  async listMessages(
    accountId: string,
    params: {
      folderId?: string;
      start?: number;
      limit?: number;
      threadedMails?: boolean;
      includeto?: boolean;
      flagid?: number;
    } = {}
  ): Promise<any[]> {
    let queryParams: any = {};
    if (params.folderId) queryParams.folderId = params.folderId;
    if (params.start !== undefined) queryParams.start = params.start;
    if (params.limit !== undefined) queryParams.limit = params.limit;
    if (params.threadedMails !== undefined) queryParams.threadedMails = params.threadedMails;
    if (params.includeto !== undefined) queryParams.includeto = params.includeto;
    if (params.flagid !== undefined) queryParams.flagid = params.flagid;

    let response = await this.axios.get(`/accounts/${accountId}/messages/view`, {
      params: queryParams
    });
    return response.data?.data || [];
  }

  async searchMessages(
    accountId: string,
    params: {
      searchKey: string;
      start?: number;
      limit?: number;
      receivedTime?: number;
      includeto?: boolean;
    }
  ): Promise<any[]> {
    let queryParams: any = { searchKey: params.searchKey };
    if (params.start !== undefined) queryParams.start = params.start;
    if (params.limit !== undefined) queryParams.limit = params.limit;
    if (params.receivedTime !== undefined) queryParams.receivedTime = params.receivedTime;
    if (params.includeto !== undefined) queryParams.includeto = params.includeto;

    let response = await this.axios.get(`/accounts/${accountId}/messages/search`, {
      params: queryParams
    });
    return response.data?.data || [];
  }

  async getMessageContent(
    accountId: string,
    folderId: string,
    messageId: string,
    includeBlockContent?: boolean
  ): Promise<any> {
    let params: any = {};
    if (includeBlockContent !== undefined) {
      params.includeBlockContent = includeBlockContent;
    }
    let response = await this.axios.get(
      `/accounts/${accountId}/folders/${folderId}/messages/${messageId}/content`,
      { params }
    );
    return response.data?.data;
  }

  async getMessageMetadata(
    accountId: string,
    folderId: string,
    messageId: string
  ): Promise<any> {
    let response = await this.axios.get(
      `/accounts/${accountId}/folders/${folderId}/messages/${messageId}`
    );
    return response.data?.data;
  }

  async sendEmail(
    accountId: string,
    email: {
      fromAddress: string;
      toAddress: string;
      ccAddress?: string;
      bccAddress?: string;
      subject: string;
      content: string;
      mailFormat?: string;
      askReceipt?: string;
      isSchedule?: boolean;
      scheduleType?: number;
      timeZone?: string;
      scheduleTime?: string;
    }
  ): Promise<any> {
    let response = await this.axios.post(`/accounts/${accountId}/messages`, email);
    return response.data?.data;
  }

  async replyToEmail(
    accountId: string,
    messageId: string,
    reply: {
      fromAddress: string;
      toAddress: string;
      ccAddress?: string;
      bccAddress?: string;
      subject: string;
      content: string;
      mailFormat?: string;
    }
  ): Promise<any> {
    let response = await this.axios.post(
      `/accounts/${accountId}/messages/${messageId}`,
      reply
    );
    return response.data?.data;
  }

  async updateMessage(
    accountId: string,
    params: {
      mode: string;
      messageId: string | string[];
      [key: string]: any;
    }
  ): Promise<any> {
    let response = await this.axios.put(`/accounts/${accountId}/updatemessage`, params);
    return response.data;
  }

  async deleteMessage(accountId: string, folderId: string, messageId: string): Promise<any> {
    let response = await this.axios.delete(
      `/accounts/${accountId}/folders/${folderId}/messages/${messageId}`
    );
    return response.data;
  }

  // === Threads ===

  async updateThread(
    accountId: string,
    params: {
      mode: string;
      threadId: string | string[];
      [key: string]: any;
    }
  ): Promise<any> {
    let response = await this.axios.put(`/accounts/${accountId}/updatethread`, params);
    return response.data;
  }

  // === Tasks ===

  async listPersonalTasks(
    params: { status?: string; priority?: string; start?: number; limit?: number } = {}
  ): Promise<any[]> {
    let response = await this.axios.get('/tasks/me', { params });
    return response.data?.data || [];
  }

  async getPersonalTask(taskId: string): Promise<any> {
    let response = await this.axios.get(`/tasks/me/${taskId}`);
    return response.data?.data;
  }

  async createPersonalTask(task: {
    title: string;
    description?: string;
    priority?: string;
    status?: string;
    dueDate?: string;
    reminder?: string;
    [key: string]: any;
  }): Promise<any> {
    let response = await this.axios.post('/tasks/me', task);
    return response.data?.data;
  }

  async updatePersonalTask(
    taskId: string,
    task: {
      title?: string;
      description?: string;
      priority?: string;
      status?: string;
      dueDate?: string;
      [key: string]: any;
    }
  ): Promise<any> {
    let response = await this.axios.put(`/tasks/me/${taskId}`, task);
    return response.data?.data;
  }

  async deletePersonalTask(taskId: string): Promise<any> {
    let response = await this.axios.delete(`/tasks/me/${taskId}`);
    return response.data;
  }

  async listGroupTasks(
    groupId: string,
    params: {
      status?: string;
      priority?: string;
      start?: number;
      limit?: number;
    } = {}
  ): Promise<any[]> {
    let response = await this.axios.get(`/tasks/groups/${groupId}`, { params });
    return response.data?.data || [];
  }

  async createGroupTask(
    groupId: string,
    task: {
      title: string;
      description?: string;
      priority?: string;
      status?: string;
      dueDate?: string;
      [key: string]: any;
    }
  ): Promise<any> {
    let response = await this.axios.post(`/tasks/groups/${groupId}`, task);
    return response.data?.data;
  }

  async updateGroupTask(
    groupId: string,
    taskId: string,
    task: {
      title?: string;
      description?: string;
      priority?: string;
      status?: string;
      dueDate?: string;
      [key: string]: any;
    }
  ): Promise<any> {
    let response = await this.axios.put(`/tasks/groups/${groupId}/${taskId}`, task);
    return response.data?.data;
  }

  async deleteGroupTask(groupId: string, taskId: string): Promise<any> {
    let response = await this.axios.delete(`/tasks/groups/${groupId}/${taskId}`);
    return response.data;
  }

  // === Notes ===

  async listPersonalNotes(params: { start?: number; limit?: number } = {}): Promise<any[]> {
    let response = await this.axios.get('/notes/me', { params });
    return response.data?.data || [];
  }

  async createPersonalNote(note: {
    noteContent: string;
    noteName?: string;
    bookId?: string;
    [key: string]: any;
  }): Promise<any> {
    let response = await this.axios.post('/notes/me', note);
    return response.data?.data;
  }

  async updatePersonalNote(
    noteId: string,
    note: {
      noteContent?: string;
      noteName?: string;
      [key: string]: any;
    }
  ): Promise<any> {
    let response = await this.axios.put(`/notes/me/${noteId}`, note);
    return response.data?.data;
  }

  async deletePersonalNote(noteId: string): Promise<any> {
    let response = await this.axios.delete(`/notes/me/${noteId}`);
    return response.data;
  }

  async listGroupNotes(
    groupId: string,
    params: {
      start?: number;
      limit?: number;
    } = {}
  ): Promise<any[]> {
    let response = await this.axios.get(`/notes/groups/${groupId}`, { params });
    return response.data?.data || [];
  }

  async createGroupNote(
    groupId: string,
    note: {
      noteContent: string;
      noteName?: string;
      bookId?: string;
      [key: string]: any;
    }
  ): Promise<any> {
    let response = await this.axios.post(`/notes/groups/${groupId}`, note);
    return response.data?.data;
  }

  // === Bookmarks ===

  async listPersonalBookmarks(
    params: { start?: number; limit?: number } = {}
  ): Promise<any[]> {
    let response = await this.axios.get('/links/me', { params });
    return response.data?.data || [];
  }

  async createPersonalBookmark(bookmark: {
    url: string;
    name?: string;
    description?: string;
    collectionId?: string;
    [key: string]: any;
  }): Promise<any> {
    let response = await this.axios.post('/links/me', bookmark);
    return response.data?.data;
  }

  async deletePersonalBookmark(bookmarkId: string): Promise<any> {
    let response = await this.axios.delete(`/links/me/${bookmarkId}`);
    return response.data;
  }

  async listGroupBookmarks(
    groupId: string,
    params: {
      start?: number;
      limit?: number;
    } = {}
  ): Promise<any[]> {
    let response = await this.axios.get(`/links/groups/${groupId}`, { params });
    return response.data?.data || [];
  }

  async createGroupBookmark(
    groupId: string,
    bookmark: {
      url: string;
      name?: string;
      description?: string;
      collectionId?: string;
      [key: string]: any;
    }
  ): Promise<any> {
    let response = await this.axios.post(`/links/groups/${groupId}`, bookmark);
    return response.data?.data;
  }

  // === Organization (Admin) ===

  async getOrganizationDetails(organizationId: string): Promise<any> {
    let response = await this.axios.get(`/organization/${organizationId}`);
    return response.data?.data;
  }

  async getOrganizationStorage(organizationId: string): Promise<any> {
    let response = await this.axios.get(`/organization/${organizationId}/storage`);
    return response.data?.data;
  }

  async listOrganizationUsers(
    organizationId: string,
    params: {
      start?: number;
      limit?: number;
    } = {}
  ): Promise<any[]> {
    let response = await this.axios.get(`/organization/${organizationId}/accounts`, {
      params
    });
    return response.data?.data || [];
  }

  async getOrganizationUser(organizationId: string, userId: string): Promise<any> {
    let response = await this.axios.get(`/organization/${organizationId}/accounts/${userId}`);
    return response.data?.data;
  }

  async createOrganizationUser(
    organizationId: string,
    user: {
      primaryEmailAddress: string;
      password: string;
      displayName?: string;
      role?: string;
      country?: string;
      [key: string]: any;
    }
  ): Promise<any> {
    let response = await this.axios.post(`/organization/${organizationId}/accounts`, user);
    return response.data?.data;
  }

  async listOrganizationDomains(organizationId: string): Promise<any[]> {
    let response = await this.axios.get(`/organization/${organizationId}/domains`);
    return response.data?.data || [];
  }

  async listOrganizationGroups(organizationId: string): Promise<any[]> {
    let response = await this.axios.get(`/organization/${organizationId}/groups`);
    return response.data?.data || [];
  }

  async createOrganizationGroup(
    organizationId: string,
    group: {
      groupName: string;
      emailAddress: string;
      description?: string;
      [key: string]: any;
    }
  ): Promise<any> {
    let response = await this.axios.post(`/organization/${organizationId}/groups`, group);
    return response.data?.data;
  }

  // === Signatures ===

  async listSignatures(): Promise<any[]> {
    let response = await this.axios.get('/accounts/signature');
    return response.data?.data || [];
  }

  async createSignature(signature: {
    signatureName: string;
    content: string;
    [key: string]: any;
  }): Promise<any> {
    let response = await this.axios.post('/accounts/signature', signature);
    return response.data?.data;
  }

  async updateSignature(
    signatureId: string,
    signature: {
      signatureName?: string;
      content?: string;
      [key: string]: any;
    }
  ): Promise<any> {
    let response = await this.axios.put(`/accounts/signature/${signatureId}`, signature);
    return response.data?.data;
  }

  async deleteSignature(signatureId: string): Promise<any> {
    let response = await this.axios.delete(`/accounts/signature/${signatureId}`);
    return response.data;
  }

  // === Logs (Admin) ===

  async getLoginHistory(
    organizationId: string,
    params: {
      start?: number;
      limit?: number;
    } = {}
  ): Promise<any[]> {
    let response = await this.axios.get(
      `/organization/${organizationId}/accounts/reports/loginHistory`,
      { params }
    );
    return response.data?.data || [];
  }

  async getAuditLogs(
    organizationId: string,
    params: {
      start?: number;
      limit?: number;
    } = {}
  ): Promise<any[]> {
    let response = await this.axios.get(`/organization/${organizationId}/activity`, {
      params
    });
    return response.data?.data || [];
  }
}
