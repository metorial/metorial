import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined,
  requestAxiosData
} from 'slates';

export let BASE_URL = 'https://gagelist.net/GageList/api';
let DEFAULT_PAGE_SIZE = 50;

type RequestConfig = Parameters<ReturnType<typeof createAuthenticatedAxios>['request']>[0];

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    if (!config.token?.trim()) {
      throw createApiServiceError('Connect GageList with valid API credentials.');
    }
    this.axios = createAuthenticatedAxios({
      baseURL: BASE_URL,
      authHeader: { value: `Bearer ${config.token}` },
      headers: { Accept: 'application/json' },
      timeout: 30_000
    });
  }

  private async request(config: RequestConfig): Promise<any> {
    let result = await requestAxiosData<any>(
      config.url ?? 'request',
      () => this.axios.request(config),
      (error, operation) =>
        buildApiServiceError(error, {
          providerLabel: 'GageList',
          operation,
          reason: 'gagelist_api_error'
        })
    );
    if (!isApiErrorRecord(result)) {
      throw createApiServiceError('GageList returned an invalid API response.');
    }
    if (result.success === false) {
      throw createApiServiceError(
        typeof result.message === 'string' && result.message
          ? `GageList: ${result.message}`
          : 'GageList could not complete the request.'
      );
    }
    if (result.success !== true) {
      throw createApiServiceError('GageList did not confirm the request succeeded.');
    }
    return result;
  }

  private async list(config: RequestConfig): Promise<any> {
    let result = await this.request(config);
    if (!Array.isArray(result.data) || !result.data.every(isApiErrorRecord)) {
      throw createApiServiceError('GageList returned an invalid record list.');
    }
    return result;
  }

  private async detail(url: string): Promise<any> {
    let result = await this.request({ url });
    if (!isApiErrorRecord(result.data)) {
      throw createApiServiceError('GageList did not return the requested record.');
    }
    return result;
  }

  private async create(url: string, data: Record<string, unknown>): Promise<any> {
    let result = await this.request({ url, method: 'POST', data: pickDefined(data) });
    if (typeof result.data !== 'number' || !Number.isFinite(result.data)) {
      throw createApiServiceError('GageList did not return the created record ID.');
    }
    return result;
  }

  async getAccountStatus(): Promise<any> {
    return this.detail('/Account/Status');
  }

  async getAccountSettings(): Promise<any> {
    return this.detail('/Account/Settings');
  }

  async updateAccountSettings(settings: Record<string, unknown>): Promise<any> {
    return this.request({
      url: '/Account/Settings',
      method: 'POST',
      data: pickDefined(settings)
    });
  }

  async listGages(params?: { start?: number; recordNumber?: number }): Promise<any> {
    return this.list({
      url: '/Gage/List',
      method: 'POST',
      params: {
        start: params?.start ?? 0,
        record_number: params?.recordNumber ?? DEFAULT_PAGE_SIZE
      }
    });
  }

  async getGage(gageId: number): Promise<any> {
    return this.detail(`/Gage/Detail/${gageId}`);
  }

  async createGage(data: Record<string, unknown>): Promise<any> {
    return this.create('/Gage/Create', data);
  }

  async updateGage(data: Record<string, unknown>): Promise<any> {
    return this.request({ url: '/Gage/Update', method: 'POST', data: pickDefined(data) });
  }

  async deleteGage(gageId: number): Promise<any> {
    return this.request({ url: `/Gage/Delete/${gageId}`, method: 'POST' });
  }

  async listCalibrations(params?: { start?: number; recordNumber?: number }): Promise<any> {
    return this.list({
      url: '/Calibration/List',
      method: 'POST',
      params: {
        start: params?.start ?? 0,
        record_number: params?.recordNumber ?? DEFAULT_PAGE_SIZE
      }
    });
  }

  async getCalibration(calibrationId: number): Promise<any> {
    return this.detail(`/Calibration/Detail/${calibrationId}`);
  }

  async createCalibration(data: Record<string, unknown>): Promise<any> {
    return this.create('/Calibration/Create', data);
  }

  async updateCalibration(data: Record<string, unknown>): Promise<any> {
    return this.request({
      url: '/Calibration/Update',
      method: 'POST',
      data: pickDefined(data)
    });
  }

  async deleteCalibration(calibrationId: number): Promise<any> {
    return this.request({ url: `/Calibration/Delete/${calibrationId}`, method: 'POST' });
  }

  async getCalibrationCertificate(calibrationId: number): Promise<any> {
    let response = await requestAxiosData<any>(
      'generate calibration certificate',
      () => this.axios.get(`/Calibration/GetCertificate/${calibrationId}`),
      (error, operation) =>
        buildApiServiceError(error, {
          providerLabel: 'GageList',
          operation,
          reason: 'gagelist_api_error'
        })
    );
    if (isApiErrorRecord(response) && response.success === false) {
      throw createApiServiceError(
        typeof response.message === 'string'
          ? `GageList: ${response.message}`
          : 'GageList could not generate the certificate.'
      );
    }
    if (
      response === null ||
      response === undefined ||
      (typeof response === 'string' && !response.trimStart().startsWith('%PDF-'))
    ) {
      throw createApiServiceError('GageList did not return a calibration certificate.');
    }
    return response;
  }

  async listManufacturers(): Promise<any> {
    return this.list({ url: '/Manufacturer/List', method: 'POST' });
  }

  async addManufacturer(data: Record<string, unknown>): Promise<any> {
    return this.create('/Manufacturer/Create', data);
  }

  async updateManufacturer(data: Record<string, unknown>): Promise<any> {
    return this.request({
      url: '/Manufacturer/Update',
      method: 'POST',
      data: pickDefined(data)
    });
  }

  async deleteManufacturer(manufacturerId: number): Promise<any> {
    return this.request({ url: `/Manufacturer/Delete/${manufacturerId}`, method: 'POST' });
  }

  async getCustomFields(): Promise<any> {
    return this.list({ url: '/CustomField/GetCustomFields' });
  }

  async getCustomFieldValues(recordId: number): Promise<any> {
    // The official article currently repeats the Account/Status route. Retain the
    // existing route until the provider confirms the custom-values GET contract.
    return this.list({ url: `/CustomField/Values/${recordId}` });
  }

  async updateCustomFieldValues(values: Record<string, unknown>[]): Promise<any> {
    return this.request({
      url: '/CustomField/UpdateCustomValues',
      method: 'POST',
      data: values
    });
  }

  async deleteAttachment(attachmentId: number): Promise<void> {
    let result = await requestAxiosData<any>(
      'delete attachment',
      () => this.axios.post(`/Attachment/Delete/${attachmentId}`),
      (error, operation) =>
        buildApiServiceError(error, {
          providerLabel: 'GageList',
          operation,
          reason: 'gagelist_api_error'
        })
    );
    if (!isApiErrorRecord(result)) {
      throw createApiServiceError('GageList returned an invalid file-delete response.');
    }
    if (result.success === false) {
      throw createApiServiceError(
        typeof result.message === 'string'
          ? `GageList: ${result.message}`
          : 'GageList could not delete the attachment.'
      );
    }
  }
}
