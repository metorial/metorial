import { createAxios } from 'slates';

export class CrowdinClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(opts: { token: string; organizationDomain?: string }) {
    let baseURL = opts.organizationDomain
      ? `https://${opts.organizationDomain}.api.crowdin.com/api/v2`
      : 'https://api.crowdin.com/api/v2';

    this.axios = createAxios({
      baseURL,
      headers: {
        Authorization: `Bearer ${opts.token}`
      }
    });
  }

  // --- Projects ---

  async listProjects(params?: { limit?: number; offset?: number; hasManagerAccess?: number }) {
    let response = await this.axios.get('/projects', { params });
    return response.data;
  }

  async getProject(projectId: number) {
    let response = await this.axios.get(`/projects/${projectId}`);
    return response.data.data;
  }

  async createProject(body: {
    name: string;
    sourceLanguageId: string;
    targetLanguageIds?: string[];
    identifier?: string;
    type?: number;
    visibility?: string;
    description?: string;
  }) {
    let response = await this.axios.post('/projects', body);
    return response.data.data;
  }

  async updateProject(
    projectId: number,
    patches: Array<{ op: string; path: string; value: any }>
  ) {
    let response = await this.axios.patch(`/projects/${projectId}`, patches);
    return response.data.data;
  }

  async deleteProject(projectId: number) {
    await this.axios.delete(`/projects/${projectId}`);
  }

  // --- Source Files ---

  async listFiles(
    projectId: number,
    params?: {
      branchId?: number;
      directoryId?: number;
      filter?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    let response = await this.axios.get(`/projects/${projectId}/files`, { params });
    return response.data;
  }

  async getFile(projectId: number, fileId: number) {
    let response = await this.axios.get(`/projects/${projectId}/files/${fileId}`);
    return response.data.data;
  }

  async deleteFile(projectId: number, fileId: number) {
    await this.axios.delete(`/projects/${projectId}/files/${fileId}`);
  }

  async downloadFile(projectId: number, fileId: number) {
    let response = await this.axios.get(`/projects/${projectId}/files/${fileId}/download`);
    return response.data.data;
  }

  // --- Storage ---

  async addStorage(fileName: string, content: string) {
    let response = await this.axios.post('/storages', content, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Crowdin-API-FileName': fileName
      }
    });
    return response.data.data;
  }

  // --- File operations ---

  async createFile(
    projectId: number,
    body: {
      storageId: number;
      name: string;
      branchId?: number;
      directoryId?: number;
      title?: string;
      type?: string;
    }
  ) {
    let response = await this.axios.post(`/projects/${projectId}/files`, body);
    return response.data.data;
  }

  async updateFile(
    projectId: number,
    fileId: number,
    body: { storageId: number; updateOption?: string }
  ) {
    let response = await this.axios.put(`/projects/${projectId}/files/${fileId}`, body);
    return response.data.data;
  }

  // --- Directories ---

  async listDirectories(
    projectId: number,
    params?: { branchId?: number; limit?: number; offset?: number }
  ) {
    let response = await this.axios.get(`/projects/${projectId}/directories`, { params });
    return response.data;
  }

  async createDirectory(
    projectId: number,
    body: { name: string; branchId?: number; directoryId?: number; title?: string }
  ) {
    let response = await this.axios.post(`/projects/${projectId}/directories`, body);
    return response.data.data;
  }

  // --- Branches ---

  async listBranches(projectId: number, params?: { limit?: number; offset?: number }) {
    let response = await this.axios.get(`/projects/${projectId}/branches`, { params });
    return response.data;
  }

  async createBranch(projectId: number, body: { name: string; title?: string }) {
    let response = await this.axios.post(`/projects/${projectId}/branches`, body);
    return response.data.data;
  }

  // --- Source Strings ---

  async listStrings(
    projectId: number,
    params?: {
      fileId?: number;
      branchId?: number;
      directoryId?: number;
      filter?: string;
      scope?: string;
      croql?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    let response = await this.axios.get(`/projects/${projectId}/strings`, { params });
    return response.data;
  }

  async getString(projectId: number, stringId: number) {
    let response = await this.axios.get(`/projects/${projectId}/strings/${stringId}`);
    return response.data.data;
  }

  async addString(
    projectId: number,
    body: {
      text: string;
      identifier: string;
      fileId?: number;
      branchId?: number;
      context?: string;
      isHidden?: boolean;
      maxLength?: number;
      labelIds?: number[];
    }
  ) {
    let response = await this.axios.post(`/projects/${projectId}/strings`, body);
    return response.data.data;
  }

  async updateString(
    projectId: number,
    stringId: number,
    patches: Array<{ op: string; path: string; value: any }>
  ) {
    let response = await this.axios.patch(
      `/projects/${projectId}/strings/${stringId}`,
      patches
    );
    return response.data.data;
  }

  async deleteString(projectId: number, stringId: number) {
    await this.axios.delete(`/projects/${projectId}/strings/${stringId}`);
  }

  // --- Translation Status ---

  async getProjectProgress(projectId: number, params?: { limit?: number; offset?: number }) {
    let response = await this.axios.get(`/projects/${projectId}/languages/progress`, {
      params
    });
    return response.data;
  }

  async getFileProgress(
    projectId: number,
    fileId: number,
    params?: { limit?: number; offset?: number }
  ) {
    let response = await this.axios.get(
      `/projects/${projectId}/files/${fileId}/languages/progress`,
      { params }
    );
    return response.data;
  }

  async getBranchProgress(
    projectId: number,
    branchId: number,
    params?: { limit?: number; offset?: number }
  ) {
    let response = await this.axios.get(
      `/projects/${projectId}/branches/${branchId}/languages/progress`,
      { params }
    );
    return response.data;
  }

  async getLanguageProgress(
    projectId: number,
    languageId: string,
    params?: { limit?: number; offset?: number }
  ) {
    let response = await this.axios.get(
      `/projects/${projectId}/languages/${languageId}/files/progress`,
      { params }
    );
    return response.data;
  }

  // --- Translations ---

  async uploadTranslation(
    projectId: number,
    languageId: string,
    body: {
      storageId: number;
      fileId: number;
      importEqSuggestions?: boolean;
      autoApproveImported?: boolean;
    }
  ) {
    let response = await this.axios.post(
      `/projects/${projectId}/translations/${languageId}`,
      body
    );
    return response.data.data;
  }

  async buildTranslations(
    projectId: number,
    body?: {
      branchId?: number;
      targetLanguageIds?: string[];
      skipUntranslatedStrings?: boolean;
      skipUntranslatedFiles?: boolean;
      exportApprovedOnly?: boolean;
    }
  ) {
    let response = await this.axios.post(
      `/projects/${projectId}/translations/builds`,
      body || {}
    );
    return response.data.data;
  }

  async getBuildStatus(projectId: number, buildId: number) {
    let response = await this.axios.get(
      `/projects/${projectId}/translations/builds/${buildId}`
    );
    return response.data.data;
  }

  async downloadBuild(projectId: number, buildId: number) {
    let response = await this.axios.get(
      `/projects/${projectId}/translations/builds/${buildId}/download`
    );
    return response.data.data;
  }

  async listBuilds(
    projectId: number,
    params?: { branchId?: number; limit?: number; offset?: number }
  ) {
    let response = await this.axios.get(`/projects/${projectId}/translations/builds`, {
      params
    });
    return response.data;
  }

  // --- String Translations ---

  async addTranslation(
    projectId: number,
    body: {
      stringId: number;
      languageId: string;
      text: string;
      pluralCategoryName?: string;
    }
  ) {
    let response = await this.axios.post(`/projects/${projectId}/translations`, body);
    return response.data.data;
  }

  async listStringTranslations(
    projectId: number,
    params: {
      stringId: number;
      languageId: string;
      limit?: number;
      offset?: number;
    }
  ) {
    let response = await this.axios.get(`/projects/${projectId}/translations`, { params });
    return response.data;
  }

  async deleteTranslation(projectId: number, translationId: number) {
    await this.axios.delete(`/projects/${projectId}/translations/${translationId}`);
  }

  // --- Pre-Translation ---

  async applyPreTranslation(
    projectId: number,
    body: {
      languageIds: string[];
      fileIds: number[];
      method?: string;
      engineId?: number;
      autoApproveOption?: string;
      duplicateTranslations?: boolean;
      translateUntranslatedOnly?: boolean;
      translateWithPerfectMatchOnly?: boolean;
    }
  ) {
    let response = await this.axios.post(`/projects/${projectId}/pre-translations`, body);
    return response.data.data;
  }

  async getPreTranslationStatus(projectId: number, preTranslationId: string) {
    let response = await this.axios.get(
      `/projects/${projectId}/pre-translations/${preTranslationId}`
    );
    return response.data.data;
  }

  // --- Translation Memory ---

  async listTMs(params?: { limit?: number; offset?: number }) {
    let response = await this.axios.get('/tms', { params });
    return response.data;
  }

  async getTM(tmId: number) {
    let response = await this.axios.get(`/tms/${tmId}`);
    return response.data.data;
  }

  async createTM(body: { name: string; languageId: string; groupId?: number }) {
    let response = await this.axios.post('/tms', body);
    return response.data.data;
  }

  async updateTM(tmId: number, patches: Array<{ op: string; path: string; value: any }>) {
    let response = await this.axios.patch(`/tms/${tmId}`, patches);
    return response.data.data;
  }

  async deleteTM(tmId: number) {
    await this.axios.delete(`/tms/${tmId}`);
  }

  async exportTM(
    tmId: number,
    body?: { sourceLanguageId?: string; targetLanguageId?: string; format?: string }
  ) {
    let response = await this.axios.post(`/tms/${tmId}/exports`, body || {});
    return response.data.data;
  }

  async getTMExportStatus(tmId: number, exportId: string) {
    let response = await this.axios.get(`/tms/${tmId}/exports/${exportId}`);
    return response.data.data;
  }

  async downloadTMExport(tmId: number, exportId: string) {
    let response = await this.axios.get(`/tms/${tmId}/exports/${exportId}/download`);
    return response.data.data;
  }

  // --- TM Segments ---

  async listTMSegments(
    tmId: number,
    params?: { croql?: string; limit?: number; offset?: number }
  ) {
    let response = await this.axios.get(`/tms/${tmId}/segments`, { params });
    return response.data;
  }

  async addTMSegment(
    tmId: number,
    body: {
      records: Array<{
        languageId: string;
        text: string;
      }>;
    }
  ) {
    let response = await this.axios.post(`/tms/${tmId}/segments`, body);
    return response.data.data;
  }

  // --- Glossaries ---

  async listGlossaries(params?: { limit?: number; offset?: number }) {
    let response = await this.axios.get('/glossaries', { params });
    return response.data;
  }

  async getGlossary(glossaryId: number) {
    let response = await this.axios.get(`/glossaries/${glossaryId}`);
    return response.data.data;
  }

  async createGlossary(body: { name: string; languageId: string; groupId?: number }) {
    let response = await this.axios.post('/glossaries', body);
    return response.data.data;
  }

  async updateGlossary(
    glossaryId: number,
    patches: Array<{ op: string; path: string; value: any }>
  ) {
    let response = await this.axios.patch(`/glossaries/${glossaryId}`, patches);
    return response.data.data;
  }

  async deleteGlossary(glossaryId: number) {
    await this.axios.delete(`/glossaries/${glossaryId}`);
  }

  // --- Glossary Terms ---

  async listTerms(
    glossaryId: number,
    params?: { languageId?: string; limit?: number; offset?: number }
  ) {
    let response = await this.axios.get(`/glossaries/${glossaryId}/terms`, { params });
    return response.data;
  }

  async getTerm(glossaryId: number, termId: number) {
    let response = await this.axios.get(`/glossaries/${glossaryId}/terms/${termId}`);
    return response.data.data;
  }

  async addTerm(
    glossaryId: number,
    body: {
      languageId: string;
      text: string;
      description?: string;
      partOfSpeech?: string;
      status?: string;
      translationOfTermId?: number;
    }
  ) {
    let response = await this.axios.post(`/glossaries/${glossaryId}/terms`, body);
    return response.data.data;
  }

  async updateTerm(
    glossaryId: number,
    termId: number,
    patches: Array<{ op: string; path: string; value: any }>
  ) {
    let response = await this.axios.patch(
      `/glossaries/${glossaryId}/terms/${termId}`,
      patches
    );
    return response.data.data;
  }

  async deleteTerm(glossaryId: number, termId: number) {
    await this.axios.delete(`/glossaries/${glossaryId}/terms/${termId}`);
  }

  // --- Tasks ---

  async listTasks(
    projectId: number,
    params?: { status?: string; assigneeId?: number; limit?: number; offset?: number }
  ) {
    let response = await this.axios.get(`/projects/${projectId}/tasks`, { params });
    return response.data;
  }

  async getTask(projectId: number, taskId: number) {
    let response = await this.axios.get(`/projects/${projectId}/tasks/${taskId}`);
    return response.data.data;
  }

  async createTask(
    projectId: number,
    body: {
      title: string;
      languageId: string;
      fileIds: number[];
      type: number;
      status?: string;
      description?: string;
      assignees?: Array<{ id: number }>;
      deadline?: string;
      labelIds?: number[];
      dateFrom?: string;
      dateTo?: string;
    }
  ) {
    let response = await this.axios.post(`/projects/${projectId}/tasks`, body);
    return response.data.data;
  }

  async updateTask(
    projectId: number,
    taskId: number,
    patches: Array<{ op: string; path: string; value: any }>
  ) {
    let response = await this.axios.patch(`/projects/${projectId}/tasks/${taskId}`, patches);
    return response.data.data;
  }

  async deleteTask(projectId: number, taskId: number) {
    await this.axios.delete(`/projects/${projectId}/tasks/${taskId}`);
  }

  // --- Members ---

  async listProjectMembers(
    projectId: number,
    params?: {
      search?: string;
      role?: string;
      languageId?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    let response = await this.axios.get(`/projects/${projectId}/members`, { params });
    return response.data;
  }

  async addProjectMember(
    projectId: number,
    body: {
      userIds: number[];
      managerAccess?: boolean;
      permissions?: Record<string, any>;
      roles?: Array<{
        name: string;
        permissions?: { allLanguages?: boolean; languagesAccess?: Record<string, any> };
      }>;
    }
  ) {
    let response = await this.axios.post(`/projects/${projectId}/members`, body);
    return response.data;
  }

  async removeProjectMember(projectId: number, memberId: number) {
    await this.axios.delete(`/projects/${projectId}/members/${memberId}`);
  }

  // --- Webhooks ---

  async listWebhooks(projectId: number, params?: { limit?: number; offset?: number }) {
    let response = await this.axios.get(`/projects/${projectId}/webhooks`, { params });
    return response.data;
  }

  async createWebhook(
    projectId: number,
    body: {
      name: string;
      url: string;
      events: string[];
      requestType: string;
      isActive?: boolean;
      batchingEnabled?: boolean;
      contentType?: string;
      headers?: Record<string, string>;
    }
  ) {
    let response = await this.axios.post(`/projects/${projectId}/webhooks`, body);
    return response.data.data;
  }

  async getWebhook(projectId: number, webhookId: number) {
    let response = await this.axios.get(`/projects/${projectId}/webhooks/${webhookId}`);
    return response.data.data;
  }

  async deleteWebhook(projectId: number, webhookId: number) {
    await this.axios.delete(`/projects/${projectId}/webhooks/${webhookId}`);
  }

  // --- Screenshots ---

  async listScreenshots(projectId: number, params?: { limit?: number; offset?: number }) {
    let response = await this.axios.get(`/projects/${projectId}/screenshots`, { params });
    return response.data;
  }

  async getScreenshot(projectId: number, screenshotId: number) {
    let response = await this.axios.get(`/projects/${projectId}/screenshots/${screenshotId}`);
    return response.data.data;
  }

  // --- Machine Translation ---

  async listMTEngines(params?: { limit?: number; offset?: number }) {
    let response = await this.axios.get('/mts', { params });
    return response.data;
  }

  // --- Languages ---

  async listSupportedLanguages(params?: { limit?: number; offset?: number }) {
    let response = await this.axios.get('/languages', { params });
    return response.data;
  }

  // --- User ---

  async getAuthenticatedUser() {
    let response = await this.axios.get('/user');
    return response.data.data;
  }
}
