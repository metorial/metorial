import { createAxios, getBase64ByteLength, pickDefined, requestAxios } from 'slates';
import { z } from 'zod';
import {
  batchSchema,
  type File,
  fieldSchema,
  fileSchema,
  jobSchema,
  metadataSchema
} from './schemas';
import {
  filename,
  id,
  ids,
  invalid,
  parse,
  path,
  safeData,
  tags,
  text,
  token,
  upstream,
  url
} from './validation';

export type Update = {
  tags?: string[];
  customCoordinates?: string;
  customMetadata?: Record<string, unknown>;
  extensions?: Record<string, unknown>[];
  webhookUrl?: string;
  publish?: { isPublished: boolean; includeFileVersions?: boolean };
};
export type Upload = {
  file: string;
  fileName: string;
  tags?: string[];
  folder?: string;
  isPrivateFile?: boolean;
  useUniqueFileName?: boolean;
  customCoordinates?: string;
  customMetadata?: Record<string, unknown>;
  overwriteFile?: boolean;
  overwriteAITags?: boolean;
  overwriteTags?: boolean;
  overwriteCustomMetadata?: boolean;
  webhookUrl?: string;
  extensions?: Record<string, unknown>[];
  isPublished?: boolean;
  transformation?: {
    pre?: string;
    post?: Array<{ type: string; value?: string; protocol?: 'hls' | 'dash' }>;
  };
  checks?: string;
};
const sorts = [
  'ASC_NAME',
  'DESC_NAME',
  'ASC_CREATED',
  'DESC_CREATED',
  'ASC_UPDATED',
  'DESC_UPDATED',
  'ASC_HEIGHT',
  'DESC_HEIGHT',
  'ASC_WIDTH',
  'DESC_WIDTH',
  'ASC_SIZE',
  'DESC_SIZE',
  'ASC_RELEVANCE',
  'DESC_RELEVANCE',
  'ASC_DURATION',
  'DESC_DURATION',
  'ASC_ORIGINAL_CREATION_DATE',
  'DESC_ORIGINAL_CREATION_DATE'
];

export class Client {
  private key: string;
  private api = createAxios({
    baseURL: 'https://api.imagekit.io/v1',
    timeout: 30000,
    maxRedirects: 0
  });
  private uploadApi = createAxios({
    baseURL: 'https://upload.imagekit.io/api/v1',
    timeout: 60000,
    maxRedirects: 0
  });
  constructor(config: { token: string }) {
    this.key = token(config.token);
  }
  private headers() {
    return { Authorization: `Basic ${Buffer.from(`${this.key}:`).toString('base64')}` };
  }
  private async request(
    method: 'get' | 'post' | 'patch' | 'put' | 'delete',
    route: string,
    data?: unknown,
    params?: Record<string, unknown>,
    upload = false,
    statuses = [200]
  ) {
    safeData(route, this.key);
    safeData(params, this.key);
    if (data instanceof FormData) {
      for (const v of data.values()) if (typeof v === 'string') safeData(v, this.key);
    } else safeData(data, this.key);
    const response = await requestAxios(
      'request',
      () =>
        (upload ? this.uploadApi : this.api).request<unknown>({
          method,
          url: route,
          data,
          params,
          headers: this.headers()
        }),
      (e, op) => upstream(e, op, true)
    );
    if (!statuses.includes(response.status))
      throw invalid(
        response.status === 202
          ? 'ImageKit queued processing without returning a file ID. Check the configured webhook and Media Library before retrying; uploading again can create another file.'
          : 'ImageKit returned an unexpected response status. Check account history before retrying a write.'
      );
    return { status: response.status, data: safeData(response.data, this.key) };
  }
  private checkedFile(value: unknown, expected?: string): File {
    const file = parse(fileSchema, value);
    id(file.fileId);
    path(file.filePath, 'Returned file path', false);
    url(file.url, true);
    if (expected !== undefined && file.fileId !== expected)
      throw invalid(
        'ImageKit returned a different file. Check the exact file ID before proceeding.',
        { fileId: expected }
      );
    return file;
  }
  async uploadFile(params: Upload) {
    filename(params.fileName);
    if (params.folder !== undefined) path(params.folder);
    if (params.tags !== undefined) tags(params.tags, true, true);
    text(params.file, 'File');
    if (/^https?:\/\//i.test(params.file)) url(params.file);
    else {
      const base64 = params.file.replace(/^data:[^;,]+;base64,/, '');
      if (
        !/^[A-Za-z0-9+/]*={0,2}$/.test(base64) ||
        base64.length % 4 !== 0 ||
        !getBase64ByteLength(base64)
      )
        throw invalid('Supply a public HTTP/HTTPS file URL or valid Base64 file data.');
    }
    if (params.webhookUrl !== undefined) url(params.webhookUrl);
    if (params.transformation?.post) {
      for (const p of params.transformation.post) {
        if (
          !['transformation', 'gif-to-video', 'thumbnail', 'abs'].includes(p.type) ||
          (['transformation', 'abs'].includes(p.type) && !p.value) ||
          (p.type === 'abs' && !p.protocol) ||
          (p.type !== 'abs' && p.protocol !== undefined)
        )
          throw invalid(
            'Post-transformations require a documented type, its applicable value, and protocol only for abs.'
          );
      }
    }
    if (params.transformation?.post && params.transformation.post.length > 5)
      throw invalid('At most five post-upload transformations are supported.');
    safeData(params.customMetadata ?? {}, this.key);
    const form = new FormData();
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined) continue;
      form.append(
        k,
        k === 'tags' && Array.isArray(v)
          ? v.join(',')
          : typeof v === 'object'
            ? JSON.stringify(v)
            : String(v)
      );
    }
    form.append(
      'responseFields',
      'tags,customCoordinates,isPrivateFile,isPublished,customMetadata'
    );
    const result = await this.request(
      'post',
      '/files/upload',
      form,
      undefined,
      true,
      [200, 202]
    );
    if (result.status === 202) {
      parse(z.object({ message: z.string() }), result.data);
      return { status: 'queued' as const };
    }
    return { ...this.checkedFile(result.data), status: 'uploaded' as const };
  }
  async listFiles(
    params: {
      skip?: number;
      limit?: number;
      sort?: string;
      searchQuery?: string;
      path?: string;
      fileType?: string;
      tags?: string[];
      name?: string;
      type?: string;
    } = {}
  ) {
    const skip = params.skip ?? 0,
      limit = params.limit ?? 1000;
    if (
      !Number.isSafeInteger(skip) ||
      skip < 0 ||
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 1000 ||
      !Number.isSafeInteger(skip + limit)
    )
      throw invalid('skip must be a nonnegative safe integer; limit must be 1–1000.');
    if (params.sort !== undefined && !sorts.includes(params.sort))
      throw invalid('Use a documented ImageKit sort value such as ASC_CREATED or DESC_NAME.');
    if (params.path !== undefined) path(params.path);
    if (
      params.fileType !== undefined &&
      !['all', 'image', 'non-image'].includes(params.fileType)
    )
      throw invalid('Use image, non-image, or all for fileType.');
    if (params.tags !== undefined) tags(params.tags, false, true);
    if (
      params.searchQuery !== undefined &&
      (params.tags !== undefined || params.name !== undefined)
    )
      throw invalid(
        'ImageKit ignores tags and name when searchQuery is set. Put all filters in searchQuery or omit it.'
      );
    const query = pickDefined({
      ...params,
      skip,
      limit,
      type: params.type ?? 'file',
      tags: params.tags?.join(',')
    });
    const raw = parse(
      z.array(z.unknown()),
      (await this.request('get', '/files', undefined, query)).data
    );
    if (raw.length > limit)
      throw invalid('ImageKit returned more assets than the requested page size.');
    const folders = z.object({
      type: z.literal('folder'),
      folderId: z.string(),
      folderPath: z.string()
    });
    const files = raw.flatMap(v =>
      folders.safeParse(v).success ? [] : [this.checkedFile(v)]
    );
    return {
      files,
      returnedAssetCount: raw.length,
      omittedFolderCount: raw.length - files.length,
      nextSkip: raw.length === limit ? skip + raw.length : undefined
    };
  }
  async getFileDetails(fileId: string) {
    id(fileId);
    return this.checkedFile(
      (await this.request('get', `/files/${fileId}/details`)).data,
      fileId
    );
  }
  async updateFile(fileId: string, params: Update) {
    id(fileId);
    if (!Object.keys(pickDefined(params)).length)
      throw invalid('Provide at least one file property to update.');
    if (params.tags !== undefined) tags(params.tags, true);
    if (params.webhookUrl !== undefined) url(params.webhookUrl);
    safeData(params, this.key);
    return this.checkedFile(
      (await this.request('patch', `/files/${fileId}/details`, params)).data,
      fileId
    );
  }
  async deleteFile(fileId: string) {
    id(fileId);
    await this.request('delete', `/files/${fileId}`, undefined, undefined, false, [204]);
  }
  private batch(
    value: unknown,
    requested: string[],
    field: 'successfullyDeletedFileIds' | 'successfullyUpdatedFileIds'
  ) {
    const result = parse(batchSchema, value),
      successes = result[field];
    if (
      !successes ||
      new Set(successes).size !== successes.length ||
      successes.some(v => !requested.includes(v))
    )
      throw invalid(
        'ImageKit returned an unbound bulk receipt. Inspect the requested files before retrying.',
        { fileIds: requested }
      );
    const failures = result.errors ?? [];
    if (
      new Set(failures.map(v => v.fileId)).size !== failures.length ||
      failures.some(v => !requested.includes(v.fileId) || successes.includes(v.fileId))
    )
      throw invalid(
        'ImageKit returned conflicting bulk outcomes. Inspect the requested files before retrying.',
        { fileIds: requested }
      );
    return {
      successfulFileIds: successes,
      unconfirmedFileIds: requested.filter(v => !successes.includes(v)),
      errors: failures.map(v => ({
        fileId: v.fileId,
        error:
          'ImageKit did not complete the operation for this file. Check its ID and permissions.'
      }))
    };
  }
  async bulkDeleteFiles(fileIds: string[]) {
    ids(fileIds, 100);
    return this.batch(
      (
        await this.request(
          'post',
          '/files/batch/deleteByFileIds',
          { fileIds },
          undefined,
          false,
          [200, 207]
        )
      ).data,
      fileIds,
      'successfullyDeletedFileIds'
    );
  }
  async copyFile(
    sourceFilePath: string,
    destinationPath: string,
    includeFileVersions?: boolean
  ) {
    path(sourceFilePath, 'Source file path', false);
    path(destinationPath);
    await this.request(
      'post',
      '/files/copy',
      { sourceFilePath, destinationPath, includeFileVersions: includeFileVersions ?? false },
      undefined,
      false,
      [204]
    );
  }
  async moveFile(sourceFilePath: string, destinationPath: string) {
    path(sourceFilePath, 'Source file path', false);
    path(destinationPath);
    await this.request(
      'post',
      '/files/move',
      { sourceFilePath, destinationPath },
      undefined,
      false,
      [204]
    );
  }
  async renameFile(filePath: string, newFileName: string, purgeCache?: boolean) {
    path(filePath, 'File path', false);
    filename(newFileName);
    const r = await this.request(
      'put',
      '/files/rename',
      { filePath, newFileName, purgeCache: purgeCache ?? false },
      undefined,
      false,
      [200, 207]
    );
    const result = parse(
      z.object({ purgeRequestId: z.string().optional(), reason: z.string().optional() }),
      r.data
    );
    if (result.purgeRequestId) id(result.purgeRequestId);
    return { purgeRequestId: result.purgeRequestId, cachePurgeFailed: r.status === 207 };
  }
  private async tagOperation(route: string, fileIds: string[], values: string[], ai = false) {
    ids(fileIds);
    tags(values);
    return this.batch(
      (
        await this.request(
          'post',
          route,
          { fileIds, [ai ? 'AITags' : 'tags']: values },
          undefined,
          false,
          [200, 207]
        )
      ).data,
      fileIds,
      'successfullyUpdatedFileIds'
    );
  }
  async addTags(fileIds: string[], values: string[]) {
    return this.tagOperation('/files/addTags', fileIds, values);
  }
  async removeTags(fileIds: string[], values: string[]) {
    return this.tagOperation('/files/removeTags', fileIds, values);
  }
  async removeAITags(fileIds: string[], values: string[]) {
    return this.tagOperation('/files/removeAITags', fileIds, values, true);
  }
  async getFileMetadata(fileId: string) {
    id(fileId);
    return parse(
      metadataSchema,
      (await this.request('get', `/files/${fileId}/metadata`)).data
    );
  }
  async getMetadataByUrl(value: string) {
    url(value);
    return parse(
      metadataSchema,
      (await this.request('get', '/metadata', undefined, { url: value })).data
    );
  }
  async listCustomMetadataFields(includeDeleted?: boolean) {
    return parse(
      z.array(fieldSchema),
      (
        await this.request('get', '/customMetadataFields', undefined, {
          includeDeleted: includeDeleted ?? false
        })
      ).data
    );
  }
  private fieldDefinition(schema: Record<string, unknown>, create: boolean) {
    safeData(schema, this.key);
    if (
      create &&
      ![
        'Text',
        'Textarea',
        'Number',
        'Date',
        'Boolean',
        'SingleSelect',
        'MultiSelect'
      ].includes(String(schema.type))
    )
      throw invalid('Provide a documented custom metadata schema type.');
    if (!create && schema.type !== undefined)
      throw invalid(
        'A custom metadata field’s type cannot be changed. Omit schema.type when updating its constraints.'
      );
    if (
      create &&
      ['SingleSelect', 'MultiSelect'].includes(String(schema.type)) &&
      (!Array.isArray(schema.selectOptions) || !schema.selectOptions.length)
    )
      throw invalid('Select fields require selectOptions.');
    if (schema.isValueRequired === true && schema.defaultValue === undefined)
      throw invalid('A required custom metadata field needs a defaultValue.');
  }
  async createCustomMetadataField(params: {
    name: string;
    label: string;
    schema: Record<string, unknown>;
  }) {
    text(params.name, 'Field name');
    text(params.label, 'Field label');
    this.fieldDefinition(params.schema, true);
    if (params.name === '_internal_original_created_datetime')
      throw invalid('This metadata field name is reserved by ImageKit.');
    const result = parse(
      fieldSchema,
      (await this.request('post', '/customMetadataFields', params, undefined, false, [201]))
        .data
    );
    id(result.id);
    if (result.name !== params.name)
      throw invalid(
        'ImageKit returned a different custom metadata field. Inspect field definitions before retrying.',
        { fieldId: result.id }
      );
    return result;
  }
  async updateCustomMetadataField(
    fieldId: string,
    params: { label?: string; schema?: Record<string, unknown> }
  ) {
    id(fieldId);
    if (!Object.keys(pickDefined(params)).length)
      throw invalid('Provide a label or schema constraints to update.');
    if (params.label !== undefined) text(params.label, 'Field label');
    if (params.schema) this.fieldDefinition(params.schema, false);
    const result = parse(
      fieldSchema,
      (await this.request('patch', `/customMetadataFields/${fieldId}`, params)).data
    );
    if (result.id !== fieldId)
      throw invalid('ImageKit returned a different metadata field.', { fieldId });
    return result;
  }
  async deleteCustomMetadataField(fieldId: string) {
    id(fieldId);
    await this.request(
      'delete',
      `/customMetadataFields/${fieldId}`,
      undefined,
      undefined,
      false,
      [204]
    );
  }
  async purgeCache(value: string) {
    url(value);
    const result = parse(
      z.object({ requestId: z.string().min(1) }),
      (await this.request('post', '/files/purge', { url: value }, undefined, false, [201]))
        .data
    );
    id(result.requestId);
    return result;
  }
  async getPurgeCacheStatus(requestId: string) {
    id(requestId);
    return parse(
      z.object({ status: z.enum(['Pending', 'Completed']) }),
      (await this.request('get', `/files/purge/${requestId}`)).data
    );
  }
  async createFolder(folderName: string, parentFolderPath: string) {
    filename(folderName);
    path(parentFolderPath);
    await this.request(
      'post',
      '/folder',
      { folderName, parentFolderPath },
      undefined,
      false,
      [201]
    );
  }
  async deleteFolder(folderPath: string) {
    path(folderPath, 'Folder path', false);
    await this.request('delete', '/folder', { folderPath }, undefined, false, [204]);
  }
  async copyFolder(
    sourceFolderPath: string,
    destinationPath: string,
    includeVersions?: boolean
  ) {
    path(sourceFolderPath, 'Source folder', false);
    path(destinationPath);
    const r = parse(
      z.object({ jobId: z.string() }),
      (
        await this.request('post', '/bulkJobs/copyFolder', {
          sourceFolderPath,
          destinationPath,
          includeVersions: includeVersions ?? false
        })
      ).data
    );
    id(r.jobId);
    return r;
  }
  async moveFolder(sourceFolderPath: string, destinationPath: string) {
    path(sourceFolderPath, 'Source folder', false);
    path(destinationPath);
    const r = parse(
      z.object({ jobId: z.string() }),
      (
        await this.request('post', '/bulkJobs/moveFolder', {
          sourceFolderPath,
          destinationPath
        })
      ).data
    );
    id(r.jobId);
    return r;
  }
  async getBulkJobStatus(jobId: string) {
    id(jobId);
    const r = parse(
      jobSchema,
      (
        await this.request(
          'get',
          `/bulkJobs/${jobId}`,
          undefined,
          undefined,
          false,
          [200, 207]
        )
      ).data
    );
    if (r.jobId !== jobId) throw invalid('ImageKit returned a different bulk job.', { jobId });
    return {
      ...r,
      message:
        r.status === 'Partial success'
          ? 'The job partially succeeded. Inspect the folder and cache state before retrying.'
          : undefined
    };
  }
  async listFileVersions(fileId: string) {
    id(fileId);
    const raw = parse(
      z.array(z.unknown()),
      (await this.request('get', `/files/${fileId}/versions`)).data
    );
    const versions = raw.map(v => this.checkedFile(v));
    const keys = versions.map(v => v.versionInfo?.id);
    if (keys.some(v => !v) || new Set(keys).size !== keys.length)
      throw invalid('ImageKit returned missing or duplicate version IDs.');
    return versions;
  }
  async getFileVersionDetails(fileId: string, versionId: string) {
    id(fileId);
    id(versionId);
    const r = this.checkedFile(
      (await this.request('get', `/files/${fileId}/versions/${versionId}`)).data
    );
    if (r.versionInfo?.id !== versionId)
      throw invalid('ImageKit returned a different version.', { fileId, versionId });
    return r;
  }
  async deleteFileVersion(fileId: string, versionId: string) {
    id(fileId);
    id(versionId);
    await this.request(
      'delete',
      `/files/${fileId}/versions/${versionId}`,
      undefined,
      undefined,
      false,
      [204]
    );
  }
  async restoreFileVersion(fileId: string, versionId: string) {
    id(fileId);
    id(versionId);
    const result = this.checkedFile(
      (await this.request('put', `/files/${fileId}/versions/${versionId}/restore`, {})).data,
      fileId
    );
    if (!result.versionInfo)
      throw invalid(
        'ImageKit restored the file but did not return a version ID. Check its version history before retrying.',
        { fileId, versionId }
      );
    return result;
  }
}
