import { createAxios } from 'slates';
import type {
  ConvertApiAsyncJobResponse,
  ConvertApiConversionResponse,
  ConvertApiParameter,
  ConvertApiRawAsyncJobResponse,
  ConvertApiRawConversionResponse,
  ConvertApiRawUploadResponse,
  ConvertApiRawUserInfo,
  ConvertApiUploadResponse,
  ConvertApiUserInfo,
  FileSource
} from './types';

let regionBaseUrls: Record<string, string> = {
  auto: 'https://v2.convertapi.com',
  eu: 'https://eu-v2.convertapi.com',
  uk: 'https://uk-v2.convertapi.com',
  us: 'https://us-v2.convertapi.com',
  ca: 'https://ca-v2.convertapi.com',
  as: 'https://as-v2.convertapi.com',
  au: 'https://au-v2.convertapi.com'
};

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string; region?: string }) {
    let baseURL = regionBaseUrls[config.region ?? 'auto'] ?? regionBaseUrls.auto;
    this.axios = createAxios({
      baseURL,
      headers: {
        Authorization: `Bearer ${config.token}`
      }
    });
  }

  async convert(params: {
    sourceFormat: string;
    destinationFormat: string;
    files: FileSource[];
    storeFile?: boolean;
    parameters?: Record<string, string>;
  }): Promise<ConvertApiConversionResponse> {
    let apiParams: ConvertApiParameter[] = [];

    if (params.files.length === 1) {
      apiParams.push({
        Name: 'File',
        FileValue: this.buildFileInput(params.files[0]!)
      });
    } else {
      apiParams.push({
        Name: 'Files',
        FileValues: params.files.map(f => this.buildFileInput(f))
      });
    }

    if (params.storeFile) {
      apiParams.push({ Name: 'StoreFile', Value: 'true' });
    }

    if (params.parameters) {
      for (let [key, value] of Object.entries(params.parameters)) {
        apiParams.push({ Name: key, Value: value });
      }
    }

    let response = await this.axios.post<ConvertApiRawConversionResponse>(
      `/convert/${params.sourceFormat}/to/${params.destinationFormat}`,
      { Parameters: apiParams },
      { headers: { 'Content-Type': 'application/json' } }
    );

    return this.mapConversionResponse(response.data);
  }

  async convertAsync(params: {
    sourceFormat: string;
    destinationFormat: string;
    files: FileSource[];
    storeFile?: boolean;
    parameters?: Record<string, string>;
    webhookUrl?: string;
  }): Promise<ConvertApiAsyncJobResponse> {
    let apiParams: ConvertApiParameter[] = [];

    if (params.files.length === 1) {
      apiParams.push({
        Name: 'File',
        FileValue: this.buildFileInput(params.files[0]!)
      });
    } else {
      apiParams.push({
        Name: 'Files',
        FileValues: params.files.map(f => this.buildFileInput(f))
      });
    }

    if (params.storeFile) {
      apiParams.push({ Name: 'StoreFile', Value: 'true' });
    }

    if (params.parameters) {
      for (let [key, value] of Object.entries(params.parameters)) {
        apiParams.push({ Name: key, Value: value });
      }
    }

    let url = `/async/convert/${params.sourceFormat}/to/${params.destinationFormat}`;
    if (params.webhookUrl) {
      url += `?WebHook=${encodeURIComponent(params.webhookUrl)}`;
    }

    let response = await this.axios.post<ConvertApiRawAsyncJobResponse>(
      url,
      { Parameters: apiParams },
      { headers: { 'Content-Type': 'application/json' } }
    );

    return { jobId: response.data.JobId };
  }

  async getAsyncJobResult(jobId: string): Promise<{
    status: 'processing' | 'completed' | 'not_found';
    result?: ConvertApiConversionResponse;
  }> {
    try {
      let response = await this.axios.get<ConvertApiRawConversionResponse>(
        `/async/job/${jobId}`,
        { validateStatus: status => status === 200 || status === 202 || status === 404 }
      );

      if (response.status === 202) {
        return { status: 'processing' };
      }

      if (response.status === 404) {
        return { status: 'not_found' };
      }

      return {
        status: 'completed',
        result: this.mapConversionResponse(response.data)
      };
    } catch {
      return { status: 'not_found' };
    }
  }

  async deleteAsyncJob(jobId: string): Promise<void> {
    await this.axios.delete(`/async/job/${jobId}`);
  }

  async uploadFileFromUrl(fileUrl: string): Promise<ConvertApiUploadResponse> {
    let response = await this.axios.post<ConvertApiRawUploadResponse>(
      `/upload?url=${encodeURIComponent(fileUrl)}`
    );

    return {
      fileId: response.data.FileId,
      fileName: response.data.FileName,
      fileExt: response.data.FileExt
    };
  }

  async deleteFile(fileId: string): Promise<void> {
    await this.axios.delete(`/d/${fileId}`);
  }

  async getUserInfo(): Promise<ConvertApiUserInfo> {
    let response = await this.axios.get<ConvertApiRawUserInfo>('/user');

    return {
      secret: response.data.Secret,
      apiKey: response.data.ApiKey,
      active: response.data.Active,
      fullName: response.data.FullName,
      email: response.data.Email,
      conversionsTotal: response.data.ConversionsTotal,
      conversionsConsumed: response.data.ConversionsConsumed
    };
  }

  async getConvertersForDestination(
    destinationFormat: string
  ): Promise<Array<{ sourceFormat: string; destinationFormat: string }>> {
    let response = await this.axios.get<
      Array<{
        Name: string;
        SourceFileFormats: string[];
        SourceExtensions: string[];
        DestinationExtensions: string[];
      }>
    >(`/info/*/to/${destinationFormat}`);

    let results: Array<{ sourceFormat: string; destinationFormat: string }> = [];
    for (let converter of response.data) {
      for (let ext of converter.SourceExtensions ?? []) {
        results.push({ sourceFormat: ext, destinationFormat });
      }
    }
    return results;
  }

  async getConvertersForSource(
    sourceFormat: string
  ): Promise<Array<{ sourceFormat: string; destinationFormat: string }>> {
    let response = await this.axios.get<
      Array<{ Name: string; DestinationExtensions: string[] }>
    >(`/info/${sourceFormat}/to/*`);

    let results: Array<{ sourceFormat: string; destinationFormat: string }> = [];
    for (let converter of response.data) {
      for (let ext of converter.DestinationExtensions ?? []) {
        results.push({ sourceFormat, destinationFormat: ext });
      }
    }
    return results;
  }

  async canConvert(sourceFormat: string, destinationFormat: string): Promise<boolean> {
    try {
      let response = await this.axios.get(
        `/info/canconvert/${sourceFormat}/to/${destinationFormat}`,
        { validateStatus: status => status === 200 || status === 404 }
      );
      return response.status === 200;
    } catch {
      return false;
    }
  }

  private buildFileInput(source: FileSource) {
    switch (source.type) {
      case 'url':
        return { Url: source.url };
      case 'fileId':
        return { Id: source.fileId };
      case 'base64':
        return { Name: source.fileName, Data: source.data };
    }
  }

  private mapConversionResponse(
    raw: ConvertApiRawConversionResponse
  ): ConvertApiConversionResponse {
    return {
      conversionCost: raw.ConversionCost,
      conversionTime: raw.ConversionTime,
      files: (raw.Files ?? []).map(f => ({
        fileName: f.FileName,
        fileExt: f.FileExt,
        fileSize: f.FileSize,
        fileId: f.FileId ?? null,
        url: f.Url ?? null,
        fileData: f.FileData ?? null
      }))
    };
  }
}
