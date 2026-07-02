import { createAxios } from 'slates';

let BASE_URL = 'https://gagelist.net/GageList/api';
let DEFAULT_PAGE_SIZE = 50;

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Account ───────────────────────────────────────────────

  async getAccountStatus(): Promise<any> {
    let response = await this.axios.get('/Account/Status');
    return response.data;
  }

  async getAccountSettings(): Promise<any> {
    let response = await this.axios.get('/Account/Settings');
    return response.data;
  }

  async updateAccountSettings(settings: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/Account/Settings', settings);
    return response.data;
  }

  // ── Gages ─────────────────────────────────────────────────

  async listGages(params?: { start?: number; recordNumber?: number }): Promise<any> {
    let response = await this.axios.post('/Gage/List', null, {
      params: {
        start: params?.start ?? 0,
        record_number: params?.recordNumber ?? DEFAULT_PAGE_SIZE
      }
    });
    return response.data;
  }

  async getGage(gageId: number): Promise<any> {
    let response = await this.axios.get(`/Gage/Detail/${gageId}`);
    return response.data;
  }

  async createGage(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/Gage/Create', data);
    return response.data;
  }

  async updateGage(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/Gage/Update', data);
    return response.data;
  }

  async deleteGage(gageId: number): Promise<any> {
    let response = await this.axios.delete(`/Gage/Delete/${gageId}`);
    return response.data;
  }

  async getAllGages(): Promise<any[]> {
    let allItems: any[] = [];
    let start = 0;
    while (true) {
      let result = await this.listGages({ start, recordNumber: DEFAULT_PAGE_SIZE });
      let items = result.data;
      if (!items || items.length === 0) break;
      allItems.push(...items);
      start += DEFAULT_PAGE_SIZE;
    }
    return allItems;
  }

  // ── Calibrations ──────────────────────────────────────────

  async listCalibrations(params?: { start?: number; recordNumber?: number }): Promise<any> {
    let response = await this.axios.post('/Calibration/List', null, {
      params: {
        start: params?.start ?? 0,
        record_number: params?.recordNumber ?? DEFAULT_PAGE_SIZE
      }
    });
    return response.data;
  }

  async getCalibration(calibrationId: number): Promise<any> {
    let response = await this.axios.get(`/Calibration/Detail/${calibrationId}`);
    return response.data;
  }

  async createCalibration(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/Calibration/Add', data);
    return response.data;
  }

  async updateCalibration(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/Calibration/Update', data);
    return response.data;
  }

  async deleteCalibration(calibrationId: number): Promise<any> {
    let response = await this.axios.delete(`/Calibration/Delete/${calibrationId}`);
    return response.data;
  }

  async getCalibrationCertificate(calibrationId: number): Promise<any> {
    let response = await this.axios.get(`/Calibration/GetCertificate/${calibrationId}`);
    return response.data;
  }

  async getAllCalibrations(): Promise<any[]> {
    let allItems: any[] = [];
    let start = 0;
    while (true) {
      let result = await this.listCalibrations({ start, recordNumber: DEFAULT_PAGE_SIZE });
      let items = result.data;
      if (!items || items.length === 0) break;
      allItems.push(...items);
      start += DEFAULT_PAGE_SIZE;
    }
    return allItems;
  }

  // ── Manufacturers ─────────────────────────────────────────

  async listManufacturers(): Promise<any> {
    let response = await this.axios.post('/Manufacturer/List');
    return response.data;
  }

  async addManufacturer(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/Manufacturer/Add', data);
    return response.data;
  }

  async updateManufacturer(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/Manufacturer/Update', data);
    return response.data;
  }

  async deleteManufacturer(manufacturerId: number): Promise<any> {
    let response = await this.axios.delete(`/Manufacturer/Delete/${manufacturerId}`);
    return response.data;
  }

  // ── Custom Fields ─────────────────────────────────────────

  async getCustomFields(): Promise<any> {
    let response = await this.axios.get('/CustomField/List');
    return response.data;
  }

  async getCustomFieldValues(recordId: number): Promise<any> {
    let response = await this.axios.get(`/CustomField/Values/${recordId}`);
    return response.data;
  }

  async updateCustomFieldValues(data: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/CustomField/UpdateValues', data);
    return response.data;
  }

  // ── Attachments ───────────────────────────────────────────

  async uploadGageAttachment(gageId: number, fileData: any): Promise<any> {
    let response = await this.axios.post(
      `/Attachment/UploadGageAttachment/${gageId}`,
      fileData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    return response.data;
  }

  async uploadCalibrationAttachment(calibrationId: number, fileData: any): Promise<any> {
    let response = await this.axios.post(
      `/Attachment/UploadCalibrationAttachment/${calibrationId}`,
      fileData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    return response.data;
  }

  async getAttachment(attachmentId: number): Promise<any> {
    let response = await this.axios.get(`/Attachment/${attachmentId}`);
    return response.data;
  }

  async deleteAttachment(attachmentId: number): Promise<any> {
    let response = await this.axios.delete(`/Attachment/Delete/${attachmentId}`);
    return response.data;
  }
}
