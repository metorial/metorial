import { createAxios } from 'slates';

export interface RagicClientConfig {
  token: string;
  serverDomain: string;
  accountName: string;
}

export interface SheetPath {
  tabFolder: string;
  sheetIndex: number;
}

export interface ListRecordsParams {
  where?: Array<{ fieldId: string; operator: string; value: string }>;
  fts?: string;
  order?: { fieldId: string; direction: 'ASC' | 'DESC' };
  limit?: number;
  offset?: number;
  subtables?: boolean;
  listing?: boolean;
  naming?: 'EID' | 'FNAME';
  info?: boolean;
  comment?: boolean;
  reverse?: boolean;
}

export interface WriteParams {
  doFormula?: boolean;
  doDefaultValue?: boolean;
  doLinkLoad?: boolean | 'first';
  doWorkflow?: boolean;
  notification?: boolean;
  checkLock?: boolean;
}

export class Client {
  private baseURL: string;
  private token: string;
  private accountName: string;

  constructor(config: RagicClientConfig) {
    this.baseURL = `https://${config.serverDomain}`;
    this.token = config.token;
    this.accountName = config.accountName;
  }

  private createAxiosInstance() {
    return createAxios({
      baseURL: this.baseURL,
      headers: {
        Authorization: `Basic ${this.token}`
      }
    });
  }

  private buildSheetUrl(sheet: SheetPath): string {
    return `/${this.accountName}/${sheet.tabFolder}/${sheet.sheetIndex}`;
  }

  private buildRecordUrl(sheet: SheetPath, recordId: number): string {
    return `${this.buildSheetUrl(sheet)}/${recordId}`;
  }

  private buildQueryParams(params: ListRecordsParams): Record<string, string | string[]> {
    let query: Record<string, string | string[]> = {
      v: '3',
      api: ''
    };

    if (params.where && params.where.length > 0) {
      query.where = params.where.map(w => `${w.fieldId},${w.operator},${w.value}`);
    }

    if (params.fts) {
      query.fts = params.fts;
    }

    if (params.order) {
      query.order = `${params.order.fieldId},${params.order.direction}`;
    }

    if (params.limit !== undefined) {
      query.limit = String(params.limit);
    }

    if (params.offset !== undefined) {
      query.offset = String(params.offset);
    }

    if (params.subtables === false) {
      query.subtables = '0';
    }

    if (params.listing) {
      query.listing = 'true';
    }

    if (params.naming) {
      query.naming = params.naming;
    }

    if (params.info) {
      query.info = 'true';
    }

    if (params.comment) {
      query.comment = 'true';
    }

    if (params.reverse) {
      query.reverse = 'true';
    }

    return query;
  }

  private buildWriteParams(params?: WriteParams): Record<string, string> {
    let query: Record<string, string> = {
      v: '3',
      api: ''
    };

    if (params?.doFormula) {
      query.doFormula = 'true';
    }

    if (params?.doDefaultValue) {
      query.doDefaultValue = 'true';
    }

    if (params?.doLinkLoad !== undefined) {
      query.doLinkLoad = String(params.doLinkLoad);
    }

    if (params?.doWorkflow) {
      query.doWorkflow = 'true';
    }

    if (params?.notification !== undefined) {
      query.notification = String(params.notification);
    }

    if (params?.checkLock) {
      query.checkLock = 'true';
    }

    return query;
  }

  async listRecords(
    sheet: SheetPath,
    params: ListRecordsParams = {}
  ): Promise<Record<string, any>> {
    let ax = this.createAxiosInstance();
    let url = this.buildSheetUrl(sheet);
    let queryParams = this.buildQueryParams(params);

    let response = await ax.get(url, {
      params: queryParams
    });

    return response.data;
  }

  async getRecord(
    sheet: SheetPath,
    recordId: number,
    params: ListRecordsParams = {}
  ): Promise<Record<string, any>> {
    let ax = this.createAxiosInstance();
    let url = this.buildRecordUrl(sheet, recordId);
    let queryParams = this.buildQueryParams(params);

    let response = await ax.get(url, {
      params: queryParams
    });

    return response.data;
  }

  async createRecord(
    sheet: SheetPath,
    fields: Record<string, any>,
    writeParams?: WriteParams
  ): Promise<Record<string, any>> {
    let ax = this.createAxiosInstance();
    let url = this.buildSheetUrl(sheet);
    let queryParams = this.buildWriteParams(writeParams);

    let response = await ax.post(url, fields, {
      params: queryParams,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  }

  async updateRecord(
    sheet: SheetPath,
    recordId: number,
    fields: Record<string, any>,
    writeParams?: WriteParams
  ): Promise<Record<string, any>> {
    let ax = this.createAxiosInstance();
    let url = this.buildRecordUrl(sheet, recordId);
    let queryParams = this.buildWriteParams(writeParams);

    let response = await ax.post(url, fields, {
      params: queryParams,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  }

  async deleteRecord(sheet: SheetPath, recordId: number): Promise<Record<string, any>> {
    let ax = this.createAxiosInstance();
    let url = this.buildRecordUrl(sheet, recordId);

    let response = await ax.delete(url, {
      params: {
        v: '3',
        api: ''
      }
    });

    return response.data;
  }

  async addComment(
    sheet: SheetPath,
    recordId: number,
    comment: string
  ): Promise<Record<string, any>> {
    let ax = this.createAxiosInstance();
    let url = this.buildRecordUrl(sheet, recordId);

    let formData = new URLSearchParams();
    formData.append('c', comment);
    formData.append('api', '');

    let response = await ax.post(url, formData.toString(), {
      params: {
        api: ''
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    return response.data;
  }

  async lockRecord(sheet: SheetPath, recordId: number): Promise<Record<string, any>> {
    let ax = this.createAxiosInstance();
    let url = this.buildRecordUrl(sheet, recordId);

    let response = await ax.post(url, null, {
      params: {
        api: '',
        lock: ''
      }
    });

    return response.data;
  }

  async unlockRecord(sheet: SheetPath, recordId: number): Promise<Record<string, any>> {
    let ax = this.createAxiosInstance();
    let url = this.buildRecordUrl(sheet, recordId);

    let response = await ax.post(url, null, {
      params: {
        api: '',
        unlock: ''
      }
    });

    return response.data;
  }

  async executeActionButton(
    sheet: SheetPath,
    recordId: number,
    buttonId: string
  ): Promise<Record<string, any>> {
    let ax = this.createAxiosInstance();
    let url = this.buildRecordUrl(sheet, recordId);

    let response = await ax.post(url, null, {
      params: {
        api: '',
        bId: buttonId
      }
    });

    return response.data;
  }

  async getActionButtons(sheet: SheetPath, category?: string): Promise<Record<string, any>> {
    let ax = this.createAxiosInstance();
    let url = `${this.buildSheetUrl(sheet)}/metadata/actionButton`;

    let params: Record<string, string> = { api: '' };
    if (category) {
      params.category = category;
    }

    let response = await ax.get(url, { params });

    return response.data;
  }

  async exportRecord(
    sheet: SheetPath,
    recordId: number,
    format: string,
    exportParams?: Record<string, string>
  ): Promise<{ contentType: string; data: any }> {
    let ax = this.createAxiosInstance();
    let url = `${this.buildRecordUrl(sheet, recordId)}.${format}`;

    let params: Record<string, string> = { ...exportParams };

    let response = await ax.get(url, {
      params,
      responseType: 'arraybuffer'
    });

    return {
      contentType: String(response.headers?.['content-type'] ?? 'application/octet-stream'),
      data: response.data
    };
  }

  getFileDownloadUrl(fileReference: string): string {
    return `${this.baseURL}/sims/file.jsp?a=${this.accountName}&f=${fileReference}`;
  }
}
