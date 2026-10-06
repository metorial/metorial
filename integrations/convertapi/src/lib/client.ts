import {
  createApiServiceError,
  createAxios,
  getApiErrorStatus,
  isApiErrorRecord
} from 'slates';
import type {
  ConvertApiConversionResponse,
  ConvertApiFileInput,
  ConvertApiParameter,
  ConvertApiUploadResponse,
  ConvertApiUserInfo,
  ConverterInfo,
  ConverterParameter,
  FileSource
} from './types';
import {
  base64,
  buildFileSource,
  filename,
  format,
  guardSecrets,
  invalid,
  number,
  record,
  remoteUrl,
  resourceId,
  text,
  upstream
} from './validation';

export const regionBaseUrls: Record<string, string> = {
  auto: 'https://v2.convertapi.com',
  eu: 'https://eu-v2.convertapi.com',
  uk: 'https://uk-v2.convertapi.com',
  us: 'https://us-v2.convertapi.com',
  ca: 'https://ca-v2.convertapi.com',
  as: 'https://as-v2.convertapi.com',
  au: 'https://au-v2.convertapi.com',
  jp: 'https://jp-v2.convertapi.com'
};
type ConversionInput = {
  sourceFormat: string;
  destinationFormat: string;
  files: FileSource[];
  storeFile?: boolean;
  parameters?: Record<string, string>;
};
export class Client {
  private axios: ReturnType<typeof createAxios>;
  private secrets: string[];
  readonly baseURL: string;
  constructor(private config: { token: string; masterToken?: string; region?: string }) {
    text(config.token, 'API token or JWT');
    if (config.masterToken !== undefined) text(config.masterToken, 'Master Token');
    const region = config.region ?? 'auto';
    const baseURL = Object.hasOwn(regionBaseUrls, region) ? regionBaseUrls[region] : undefined;
    if (!baseURL)
      throw invalid('Select a documented ConvertAPI region in the connection settings.');
    this.baseURL = baseURL;
    this.secrets = [config.token, config.masterToken ?? ''];
    this.axios = createAxios({
      baseURL,
      timeout: 1250000,
      maxRedirects: 0,
      headers: { Authorization: `Bearer ${config.token}`, Accept: 'application/json' }
    });
  }
  private async request(
    method: 'GET' | 'POST' | 'DELETE',
    path: string,
    data?: unknown,
    accepted = [200],
    master = false,
    stream = false
  ) {
    try {
      return await this.axios.request<unknown>({
        method,
        url: path,
        data,
        headers: {
          ...(method === 'POST' && path.includes('/convert/')
            ? { 'Content-Type': 'application/json' }
            : {}),
          ...(master
            ? { Authorization: `Bearer ${this.config.masterToken ?? this.config.token}` }
            : {})
        },
        responseType: stream ? 'stream' : 'json',
        timeout: method === 'POST' && path.includes('/convert/') ? 1250000 : 30000,
        validateStatus: (status: number) => accepted.includes(status)
      });
    } catch (error) {
      throw upstream(error, `${method} ${path.split('?')[0]}`);
    }
  }
  private parameters(input: ConversionInput): ConvertApiParameter[] {
    format(input.sourceFormat);
    format(input.destinationFormat);
    guardSecrets([input.sourceFormat, input.destinationFormat], this.secrets);
    if (!input.files.length) throw invalid('Provide at least one source file.');
    const files = input.files.map(source => this.fileInput(source));
    const params: ConvertApiParameter[] = [
      files.length === 1
        ? { Name: 'File', FileValue: files[0] }
        : { Name: 'Files', FileValues: files }
    ];
    params.push({ Name: 'StoreFile', Value: String(input.storeFile ?? false) });
    for (const [key, value] of Object.entries(input.parameters ?? {})) {
      if (
        !/^[A-Za-z][A-Za-z0-9]*$/.test(key) ||
        /^(?:file|files|storefile|auth|token|secret|mastertoken|jobid|webhook)$/i.test(key)
      )
        throw invalid(
          'Conversion parameters cannot override file inputs, storage, authentication, jobs, or callbacks. Use parameter names from list_supported_conversions.'
        );
      if (typeof value !== 'string')
        throw invalid('Conversion parameter values must be strings.');
      guardSecrets([key, value], this.secrets);
      params.push({ Name: key, Value: value });
    }
    return params;
  }
  private fileInput(source: FileSource): ConvertApiFileInput {
    let checked: FileSource;
    if (source.type === 'url') checked = buildFileSource({ url: source.url });
    else if (source.type === 'fileId') checked = buildFileSource({ fileId: source.fileId });
    else checked = buildFileSource({ base64Data: source.data, fileName: source.fileName });
    guardSecrets(checked, this.secrets);
    switch (checked.type) {
      case 'url':
        return { Url: checked.url };
      case 'fileId':
        return { Id: checked.fileId };
      case 'base64':
        return { Name: checked.fileName, Data: checked.data };
    }
  }
  async convert(input: ConversionInput): Promise<ConvertApiConversionResponse> {
    const parameters = this.parameters(input);
    const response = await this.request(
      'POST',
      `/convert/${input.sourceFormat}/to/${input.destinationFormat}`,
      { Parameters: parameters }
    );
    return this.mapConversionResponse(response.data);
  }
  async convertAsync(input: ConversionInput): Promise<{ jobId: string }> {
    const parameters = this.parameters(input);
    const response = await this.request(
      'POST',
      `/async/convert/${input.sourceFormat}/to/${input.destinationFormat}`,
      { Parameters: parameters }
    );
    const jobId = resourceId(record(response.data).JobId, true);
    guardSecrets(jobId, this.secrets);
    return { jobId };
  }
  async getAsyncJobResult(jobId: string): Promise<{
    status: 'processing' | 'completed' | 'not_found';
    result?: ConvertApiConversionResponse;
  }> {
    resourceId(jobId, true);
    guardSecrets(jobId, this.secrets);
    const response = await this.request(
      'GET',
      `/async/job/${jobId}`,
      undefined,
      [200, 202, 404]
    );
    if (response.status === 202) return { status: 'processing' };
    if (response.status === 404) return { status: 'not_found' };
    return { status: 'completed', result: this.mapConversionResponse(response.data) };
  }
  async deleteAsyncJob(jobId: string): Promise<{
    deleted: boolean;
    beforeStatus: 'processing' | 'completed' | 'not_found';
    absenceConfirmed: boolean;
  }> {
    const before = await this.getAsyncJobResult(jobId);
    if (before.status === 'not_found')
      return { deleted: false, beforeStatus: before.status, absenceConfirmed: true };
    const receipt = await this.request('DELETE', `/async/job/${jobId}`, undefined, [200]);
    let after: Awaited<ReturnType<Client['getAsyncJobResult']>>;
    try {
      after = await this.getAsyncJobResult(jobId);
    } catch (error) {
      throw this.cleanupReadbackError(error, 'job retention record');
    }
    if (receipt.status !== 200 || after.status !== 'not_found')
      throw invalid(
        'ConvertAPI accepted job deletion but absence was not confirmed. Processing may continue and credits are not refunded. Reconcile this exact job before retrying.'
      );
    return { deleted: true, beforeStatus: before.status, absenceConfirmed: true };
  }
  fileUrl(fileId: string): string {
    resourceId(fileId);
    guardSecrets(fileId, this.secrets);
    return `${this.baseURL}/d/${fileId}`;
  }
  trustedFileUrl(value: string, expectedId: string | null): string {
    remoteUrl(value);
    guardSecrets(value, this.secrets);
    const url = new URL(value);
    if (
      !Object.values(regionBaseUrls).includes(url.origin) ||
      url.protocol !== 'https:' ||
      url.search
    )
      throw invalid(
        'ConvertAPI returned an unexpected download host or query. Contact provider support; no credentials will be forwarded.'
      );
    const parts = url.pathname.split('/');
    if (parts[1] !== 'd' || !parts[2] || parts.length > 4)
      throw invalid('ConvertAPI returned an unexpected file download path.');
    const id = resourceId(parts[2]);
    if (expectedId && id !== expectedId)
      throw invalid('ConvertAPI download URL does not match the returned file ID.');
    return value;
  }
  async fileExists(fileId: string): Promise<boolean> {
    this.fileUrl(fileId);
    const response = await this.request(
      'GET',
      `/d/${fileId}`,
      undefined,
      [200, 404],
      false,
      true
    );
    const body = response.data;
    if (
      body &&
      typeof body === 'object' &&
      'destroy' in body &&
      typeof body.destroy === 'function'
    )
      body.destroy();
    return response.status === 200;
  }
  async deleteFile(fileId: string): Promise<{ deleted: boolean; absenceConfirmed: boolean }> {
    const exists = await this.fileExists(fileId);
    if (!exists) return { deleted: false, absenceConfirmed: true };
    await this.request('DELETE', `/d/${fileId}`, undefined, [200]);
    let remains: boolean;
    try {
      remains = await this.fileExists(fileId);
    } catch (error) {
      throw this.cleanupReadbackError(error, 'temporary file');
    }
    if (remains)
      throw invalid(
        'ConvertAPI accepted file deletion but the file remains available. Reconcile this exact ID before retrying.'
      );
    return { deleted: true, absenceConfirmed: true };
  }
  private cleanupReadbackError(error: unknown, resource: string) {
    const status =
      getApiErrorStatus(error) ??
      (isApiErrorRecord(error) && isApiErrorRecord(error.data)
        ? error.data.upstreamStatus
        : undefined);
    return createApiServiceError(
      `ConvertAPI accepted deletion of the ${resource}, but readback failed. Reconcile this exact resource before retrying. Processing, output files, history and consumed credits are not proven reversed.`,
      {
        reason: 'convertapi_partial_cleanup',
        upstreamStatus:
          typeof status === 'number' || typeof status === 'string' ? status : undefined,
        parent: {}
      }
    );
  }
  async uploadFileFromUrl(fileUrl: string): Promise<ConvertApiUploadResponse> {
    remoteUrl(fileUrl);
    guardSecrets(fileUrl, this.secrets);
    const response = await this.request('POST', `/upload?url=${encodeURIComponent(fileUrl)}`);
    const raw = record(response.data);
    const result = {
      fileId: resourceId(raw.FileId),
      fileName: filename(raw.FileName),
      fileExt: text(raw.FileExt, 'File extension')
    };
    guardSecrets(result, this.secrets);
    return result;
  }
  async getUserInfo(): Promise<ConvertApiUserInfo> {
    const response = await this.request('GET', '/user', undefined, [200], true);
    const raw = record(response.data);
    if (typeof raw.Active !== 'boolean')
      throw invalid('ConvertAPI returned an invalid account status.');
    const result: ConvertApiUserInfo = {
      active: raw.Active,
      fullName: text(raw.FullName, 'Account name'),
      email: text(raw.Email, 'Account email'),
      conversionsTotal: number(raw.ConversionsTotal, 'total credits'),
      conversionsConsumed: number(raw.ConversionsConsumed, 'consumed credits')
    };
    if (raw.ApiKey !== undefined && raw.ApiKey !== null)
      result.apiKey = number(raw.ApiKey, 'legacy account identifier');
    guardSecrets(result, this.secrets);
    return result;
  }
  async canConvert(sourceFormat: string, destinationFormat: string): Promise<boolean> {
    guardSecrets([sourceFormat, destinationFormat], this.secrets);
    const response = await this.request(
      'GET',
      `/info/canconvert/${format(sourceFormat)}/to/${format(destinationFormat)}`,
      undefined,
      [200, 404]
    );
    return response.status === 200;
  }
  async getConverters(
    sourceFormat?: string,
    destinationFormat?: string,
    includeParameters = false
  ): Promise<ConverterInfo[]> {
    guardSecrets([sourceFormat, destinationFormat], this.secrets);
    if (sourceFormat !== undefined) format(sourceFormat);
    if (destinationFormat !== undefined) format(destinationFormat);
    const path =
      sourceFormat !== undefined || destinationFormat !== undefined
        ? `/info/${sourceFormat ?? '*'}/to/${destinationFormat ?? '*'}`
        : '/info';
    const response = await this.request('GET', path);
    if (!Array.isArray(response.data))
      throw invalid('ConvertAPI returned an unexpected converter inventory.');
    const result: ConverterInfo[] = [];
    for (const value of response.data) {
      const row = record(value);
      if (!Array.isArray(row.SourceExtensions) || !Array.isArray(row.DestinationExtensions))
        throw invalid('ConvertAPI returned incomplete converter formats.');
      let parameters: ConverterParameter[] | undefined;
      if (includeParameters) {
        if (!Array.isArray(row.ConverterParameterGroups))
          throw invalid('ConvertAPI returned incomplete parameter metadata.');
        parameters = [];
        for (const value of row.ConverterParameterGroups) {
          const group = record(value);
          if (!Array.isArray(group.ConverterParameters))
            throw invalid('ConvertAPI returned incomplete parameter metadata.');
          for (const p of group.ConverterParameters) {
            const parameter = record(p);
            const name = text(parameter.Name, 'Parameter name');
            if (/^(?:Secret|Token|Auth|MasterToken)$/i.test(name)) continue;
            if (
              typeof parameter.Required !== 'boolean' ||
              typeof parameter.Array !== 'boolean'
            )
              throw invalid('ConvertAPI returned invalid parameter metadata.');
            parameters.push({
              name,
              type: text(parameter.Type, 'Parameter type'),
              required: parameter.Required,
              array: parameter.Array,
              description:
                typeof parameter.Description === 'string' ? parameter.Description : null,
              defaultValue: parameter.Default === undefined ? null : String(parameter.Default)
            });
          }
        }
      }
      for (const source of row.SourceExtensions)
        for (const destination of row.DestinationExtensions) {
          const pair: ConverterInfo = {
            sourceFormat: format(text(source, 'Source format')),
            destinationFormat: format(text(destination, 'Destination format'))
          };
          if (parameters) pair.parameters = parameters;
          if (
            !Array.isArray(row.SourceFileFormats) ||
            !Array.isArray(row.DestinationFileFormats) ||
            !row.SourceFileFormats.length ||
            !row.DestinationFileFormats.length
          )
            throw invalid(
              'ConvertAPI returned missing converter identifiers. Contact provider support for the exact route names.'
            );
          pair.converterSourceFormats = row.SourceFileFormats.map(v =>
            format(text(v, 'Source converter name'))
          );
          pair.converterDestinationFormats = row.DestinationFileFormats.map(v =>
            format(text(v, 'Destination converter name'))
          );
          if (pair.converterSourceFormats.length === 1)
            pair.converterSourceFormat = pair.converterSourceFormats[0];
          if (pair.converterDestinationFormats.length === 1)
            pair.converterDestinationFormat = pair.converterDestinationFormats[0];
          result.push(pair);
        }
    }
    guardSecrets(result, this.secrets);
    return result;
  }
  private mapConversionResponse(value: unknown): ConvertApiConversionResponse {
    const raw = record(value);
    if (!Array.isArray(raw.Files) || !raw.Files.length)
      throw invalid(
        'ConvertAPI returned no result files. A conversion may already have consumed credits; reconcile before retrying.'
      );
    const result: ConvertApiConversionResponse = {
      conversionCost: number(raw.ConversionCost, 'conversion cost'),
      conversionTime:
        raw.ConversionTime == null
          ? undefined
          : number(raw.ConversionTime, 'conversion duration'),
      files: raw.Files.map(value => {
        const file = record(value);
        let fileId = file.FileId == null ? null : resourceId(file.FileId);
        const url =
          file.Url == null
            ? null
            : this.trustedFileUrl(text(file.Url, 'Download URL'), fileId);
        if (!fileId && url) fileId = resourceId(new URL(url).pathname.split('/')[2]);
        let fileData: string | null = null;
        if (file.FileData != null) {
          if (typeof file.FileData !== 'string')
            throw invalid('ConvertAPI returned invalid file content.');
          fileData = file.FileData;
        }
        const fileSize = number(file.FileSize, 'file size');
        if (!Number.isSafeInteger(fileSize))
          throw invalid('ConvertAPI returned an invalid byte count.');
        if (fileData !== null && base64(fileData, true).length !== fileSize)
          throw invalid('ConvertAPI file data does not match its reported byte count.');
        if (!url && fileData === null)
          throw invalid('ConvertAPI returned a file without downloadable content.');
        return {
          fileName: filename(file.FileName),
          fileExt: text(file.FileExt, 'File extension'),
          fileSize,
          fileId,
          url,
          fileData
        };
      })
    };
    guardSecrets(result, this.secrets);
    for (const file of result.files)
      if (file.fileData) guardSecrets(base64(file.fileData).toString('utf8'), this.secrets);
    return result;
  }
}
