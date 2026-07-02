import { createAxios } from 'slates';

let api = createAxios({
  baseURL: 'https://api.imagekit.io/v1'
});

let uploadApi = createAxios({
  baseURL: 'https://upload.imagekit.io/api/v1'
});

export class Client {
  private authHeader: string;

  constructor(config: { token: string }) {
    let encoded = Buffer.from(`${config.token}:`).toString('base64');
    this.authHeader = `Basic ${encoded}`;
  }

  private headers() {
    return { Authorization: this.authHeader };
  }

  // ── File Upload ──

  async uploadFile(params: {
    file: string;
    fileName: string;
    tags?: string[];
    folder?: string;
    isPrivateFile?: boolean;
    useUniqueFileName?: boolean;
    customCoordinates?: string;
    customMetadata?: Record<string, any>;
    overwriteFile?: boolean;
    overwriteAITags?: boolean;
    overwriteTags?: boolean;
    overwriteCustomMetadata?: boolean;
    webhookUrl?: string;
    extensions?: Record<string, any>[];
    isPublished?: boolean;
    transformation?: { pre?: string; post?: Array<{ type: string; value: string }> };
    checks?: string;
  }) {
    let formData = new FormData();
    formData.append('file', params.file);
    formData.append('fileName', params.fileName);

    if (params.tags) formData.append('tags', params.tags.join(','));
    if (params.folder) formData.append('folder', params.folder);
    if (params.isPrivateFile !== undefined)
      formData.append('isPrivateFile', String(params.isPrivateFile));
    if (params.useUniqueFileName !== undefined)
      formData.append('useUniqueFileName', String(params.useUniqueFileName));
    if (params.customCoordinates)
      formData.append('customCoordinates', params.customCoordinates);
    if (params.customMetadata)
      formData.append('customMetadata', JSON.stringify(params.customMetadata));
    if (params.overwriteFile !== undefined)
      formData.append('overwriteFile', String(params.overwriteFile));
    if (params.overwriteAITags !== undefined)
      formData.append('overwriteAITags', String(params.overwriteAITags));
    if (params.overwriteTags !== undefined)
      formData.append('overwriteTags', String(params.overwriteTags));
    if (params.overwriteCustomMetadata !== undefined)
      formData.append('overwriteCustomMetadata', String(params.overwriteCustomMetadata));
    if (params.webhookUrl) formData.append('webhookUrl', params.webhookUrl);
    if (params.extensions) formData.append('extensions', JSON.stringify(params.extensions));
    if (params.isPublished !== undefined)
      formData.append('isPublished', String(params.isPublished));
    if (params.transformation)
      formData.append('transformation', JSON.stringify(params.transformation));
    if (params.checks) formData.append('checks', params.checks);

    let response = await uploadApi.post('/files/upload', formData, {
      headers: this.headers()
    });
    return response.data;
  }

  // ── File Listing ──

  async listFiles(params?: {
    skip?: number;
    limit?: number;
    sort?: string;
    searchQuery?: string;
    path?: string;
    fileType?: string;
    tags?: string[];
    name?: string;
    type?: string;
  }) {
    let queryParams: Record<string, any> = {};
    if (params?.skip !== undefined) queryParams.skip = params.skip;
    if (params?.limit !== undefined) queryParams.limit = params.limit;
    if (params?.sort) queryParams.sort = params.sort;
    if (params?.searchQuery) queryParams.searchQuery = params.searchQuery;
    if (params?.path) queryParams.path = params.path;
    if (params?.fileType) queryParams.fileType = params.fileType;
    if (params?.tags) queryParams.tags = params.tags.join(',');
    if (params?.name) queryParams.name = params.name;
    if (params?.type) queryParams.type = params.type;

    let response = await api.get('/files', {
      headers: this.headers(),
      params: queryParams
    });
    return response.data;
  }

  // ── File Details ──

  async getFileDetails(fileId: string) {
    let response = await api.get(`/files/${fileId}/details`, {
      headers: this.headers()
    });
    return response.data;
  }

  // ── File Update ──

  async updateFile(
    fileId: string,
    params: {
      tags?: string[];
      customCoordinates?: string;
      customMetadata?: Record<string, any>;
      extensions?: Record<string, any>[];
      webhookUrl?: string;
      publish?: { isPublished: boolean; includeFileVersions?: boolean };
    }
  ) {
    let response = await api.patch(`/files/${fileId}/details`, params, {
      headers: this.headers()
    });
    return response.data;
  }

  // ── File Delete ──

  async deleteFile(fileId: string) {
    await api.delete(`/files/${fileId}`, {
      headers: this.headers()
    });
  }

  async bulkDeleteFiles(fileIds: string[]) {
    let response = await api.post(
      '/files/batch/deleteByFileIds',
      { fileIds },
      {
        headers: this.headers()
      }
    );
    return response.data;
  }

  // ── File Copy / Move / Rename ──

  async copyFile(
    sourceFilePath: string,
    destinationPath: string,
    includeFileVersions?: boolean
  ) {
    await api.post(
      '/files/copy',
      {
        sourceFilePath,
        destinationPath,
        includeFileVersions: includeFileVersions ?? false
      },
      {
        headers: this.headers()
      }
    );
  }

  async moveFile(sourceFilePath: string, destinationPath: string) {
    await api.post(
      '/files/move',
      {
        sourceFilePath,
        destinationPath
      },
      {
        headers: this.headers()
      }
    );
  }

  async renameFile(filePath: string, newFileName: string, purgeCache?: boolean) {
    let response = await api.put(
      '/files/rename',
      {
        filePath,
        newFileName,
        purgeCache: purgeCache ?? false
      },
      {
        headers: this.headers()
      }
    );
    return response.data;
  }

  // ── Bulk Tags ──

  async addTags(fileIds: string[], tags: string[]) {
    let response = await api.post(
      '/files/addTags',
      { fileIds, tags },
      {
        headers: this.headers()
      }
    );
    return response.data;
  }

  async removeTags(fileIds: string[], tags: string[]) {
    let response = await api.post(
      '/files/removeTags',
      { fileIds, tags },
      {
        headers: this.headers()
      }
    );
    return response.data;
  }

  async removeAITags(fileIds: string[], aiTags: string[]) {
    let response = await api.post(
      '/files/removeAITags',
      { fileIds, AITags: aiTags },
      {
        headers: this.headers()
      }
    );
    return response.data;
  }

  // ── File Metadata ──

  async getFileMetadata(fileId: string) {
    let response = await api.get(`/files/${fileId}/metadata`, {
      headers: this.headers()
    });
    return response.data;
  }

  async getMetadataByUrl(url: string) {
    let response = await api.get('/metadata', {
      headers: this.headers(),
      params: { url }
    });
    return response.data;
  }

  // ── Custom Metadata Fields ──

  async listCustomMetadataFields(includeDeleted?: boolean) {
    let response = await api.get('/customMetadataFields', {
      headers: this.headers(),
      params: includeDeleted ? { includeDeleted: 'true' } : {}
    });
    return response.data;
  }

  async createCustomMetadataField(params: {
    name: string;
    label: string;
    schema: Record<string, any>;
  }) {
    let response = await api.post('/customMetadataFields', params, {
      headers: this.headers()
    });
    return response.data;
  }

  async updateCustomMetadataField(
    fieldId: string,
    params: {
      label?: string;
      schema?: Record<string, any>;
    }
  ) {
    let response = await api.patch(`/customMetadataFields/${fieldId}`, params, {
      headers: this.headers()
    });
    return response.data;
  }

  async deleteCustomMetadataField(fieldId: string) {
    await api.delete(`/customMetadataFields/${fieldId}`, {
      headers: this.headers()
    });
  }

  // ── Cache Purge ──

  async purgeCache(url: string) {
    let response = await api.post(
      '/files/purge',
      { url },
      {
        headers: this.headers()
      }
    );
    return response.data;
  }

  async getPurgeCacheStatus(requestId: string) {
    let response = await api.get(`/files/purge/${requestId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  // ── Folders ──

  async createFolder(folderName: string, parentFolderPath: string) {
    await api.post(
      '/folder/',
      { folderName, parentFolderPath },
      {
        headers: this.headers()
      }
    );
  }

  async deleteFolder(folderPath: string) {
    await api.delete('/folder/', {
      headers: this.headers(),
      data: { folderPath }
    });
  }

  async copyFolder(
    sourceFolderPath: string,
    destinationPath: string,
    includeVersions?: boolean
  ) {
    let response = await api.post(
      '/bulkJobs/copyFolder',
      {
        sourceFolderPath,
        destinationPath,
        includeFileVersions: includeVersions ?? false
      },
      {
        headers: this.headers()
      }
    );
    return response.data;
  }

  async moveFolder(sourceFolderPath: string, destinationPath: string) {
    let response = await api.post(
      '/bulkJobs/moveFolder',
      {
        sourceFolderPath,
        destinationPath
      },
      {
        headers: this.headers()
      }
    );
    return response.data;
  }

  async getBulkJobStatus(jobId: string) {
    let response = await api.get(`/bulkJobs/${jobId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  // ── File Versions ──

  async listFileVersions(fileId: string) {
    let response = await api.get(`/files/${fileId}/versions`, {
      headers: this.headers()
    });
    return response.data;
  }

  async getFileVersionDetails(fileId: string, versionId: string) {
    let response = await api.get(`/files/${fileId}/versions/${versionId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  async deleteFileVersion(fileId: string, versionId: string) {
    await api.delete(`/files/${fileId}/versions/${versionId}`, {
      headers: this.headers()
    });
  }

  async restoreFileVersion(fileId: string, versionId: string) {
    let response = await api.put(
      `/files/${fileId}/versions/${versionId}/restore`,
      {},
      {
        headers: this.headers()
      }
    );
    return response.data;
  }
}
