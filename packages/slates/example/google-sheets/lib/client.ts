import { createAxios } from 'slates';
import type {
  AppendValuesResponse,
  BatchGetValuesResponse,
  BatchUpdateSpreadsheetRequest,
  BatchUpdateSpreadsheetResponse,
  BatchUpdateValuesResponse,
  CellFormat,
  ClearValuesResponse,
  ConditionalFormatRule,
  DateTimeRenderOption,
  GridRange,
  InsertDataOption,
  Request,
  SheetProperties,
  Spreadsheet,
  SpreadsheetProperties,
  UpdateValuesResponse,
  ValueInputOption,
  ValueRange,
  ValueRenderOption
} from './types';

export interface ClientConfig {
  token: string;
  isApiKey?: boolean;
}

export class SheetsClient {
  private axios;
  private isApiKey: boolean;

  constructor(config: ClientConfig) {
    this.isApiKey = config.isApiKey || false;

    this.axios = createAxios({
      baseURL: 'https://sheets.googleapis.com/v4'
    });

    if (this.isApiKey) {
      this.axios.defaults.params = { key: config.token };
    } else {
      this.axios.defaults.headers.common.Authorization = `Bearer ${config.token}`;
    }
  }

  // Spreadsheet operations

  async createSpreadsheet(properties: SpreadsheetProperties): Promise<Spreadsheet> {
    let response = await this.axios.post('/spreadsheets', {
      properties
    });
    return response.data;
  }

  async getSpreadsheet(
    spreadsheetId: string,
    options?: {
      ranges?: string[];
      includeGridData?: boolean;
    }
  ): Promise<Spreadsheet> {
    let params: Record<string, unknown> = {};
    if (options?.ranges) {
      params.ranges = options.ranges;
    }
    if (options?.includeGridData !== undefined) {
      params.includeGridData = options.includeGridData;
    }

    let response = await this.axios.get(`/spreadsheets/${spreadsheetId}`, { params });
    return response.data;
  }

  async batchUpdate(
    spreadsheetId: string,
    requests: Request[],
    options?: {
      includeSpreadsheetInResponse?: boolean;
      responseRanges?: string[];
      responseIncludeGridData?: boolean;
    }
  ): Promise<BatchUpdateSpreadsheetResponse> {
    let body: BatchUpdateSpreadsheetRequest = {
      requests,
      ...options
    };

    let response = await this.axios.post(`/spreadsheets/${spreadsheetId}:batchUpdate`, body);
    return response.data;
  }

  // Sheet management

  async addSheet(
    spreadsheetId: string,
    properties: Partial<SheetProperties>
  ): Promise<SheetProperties | undefined> {
    let result = await this.batchUpdate(spreadsheetId, [
      {
        addSheet: { properties: properties as SheetProperties }
      }
    ]);
    return result.replies?.[0]?.addSheet?.properties;
  }

  async deleteSheet(spreadsheetId: string, sheetId: number): Promise<void> {
    await this.batchUpdate(spreadsheetId, [
      {
        deleteSheet: { sheetId }
      }
    ]);
  }

  async duplicateSheet(
    spreadsheetId: string,
    sourceSheetId: number,
    options?: {
      insertSheetIndex?: number;
      newSheetId?: number;
      newSheetName?: string;
    }
  ): Promise<SheetProperties | undefined> {
    let result = await this.batchUpdate(spreadsheetId, [
      {
        duplicateSheet: {
          sourceSheetId,
          ...options
        }
      }
    ]);
    return result.replies?.[0]?.duplicateSheet?.properties;
  }

  async updateSheetProperties(
    spreadsheetId: string,
    properties: SheetProperties,
    fields: string
  ): Promise<void> {
    await this.batchUpdate(spreadsheetId, [
      {
        updateSheetProperties: { properties, fields }
      }
    ]);
  }

  // Values operations

  async getValues(
    spreadsheetId: string,
    range: string,
    options?: {
      majorDimension?: 'ROWS' | 'COLUMNS';
      valueRenderOption?: ValueRenderOption;
      dateTimeRenderOption?: DateTimeRenderOption;
    }
  ): Promise<ValueRange> {
    let response = await this.axios.get(
      `/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
      { params: options }
    );
    return response.data;
  }

  async batchGetValues(
    spreadsheetId: string,
    ranges: string[],
    options?: {
      majorDimension?: 'ROWS' | 'COLUMNS';
      valueRenderOption?: ValueRenderOption;
      dateTimeRenderOption?: DateTimeRenderOption;
    }
  ): Promise<BatchGetValuesResponse> {
    let response = await this.axios.get(`/spreadsheets/${spreadsheetId}/values:batchGet`, {
      params: {
        ranges,
        ...options
      }
    });
    return response.data;
  }

  async updateValues(
    spreadsheetId: string,
    range: string,
    values: (string | number | boolean | null)[][],
    options?: {
      valueInputOption?: ValueInputOption;
      includeValuesInResponse?: boolean;
      responseValueRenderOption?: ValueRenderOption;
      responseDateTimeRenderOption?: DateTimeRenderOption;
    }
  ): Promise<UpdateValuesResponse> {
    let params = {
      valueInputOption: options?.valueInputOption || 'USER_ENTERED',
      includeValuesInResponse: options?.includeValuesInResponse,
      responseValueRenderOption: options?.responseValueRenderOption,
      responseDateTimeRenderOption: options?.responseDateTimeRenderOption
    };

    let response = await this.axios.put(
      `/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
      { range, values },
      { params }
    );
    return response.data;
  }

  async batchUpdateValues(
    spreadsheetId: string,
    data: { range: string; values: (string | number | boolean | null)[][] }[],
    options?: {
      valueInputOption?: ValueInputOption;
      includeValuesInResponse?: boolean;
      responseValueRenderOption?: ValueRenderOption;
      responseDateTimeRenderOption?: DateTimeRenderOption;
    }
  ): Promise<BatchUpdateValuesResponse> {
    let response = await this.axios.post(`/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
      data,
      valueInputOption: options?.valueInputOption || 'USER_ENTERED',
      includeValuesInResponse: options?.includeValuesInResponse,
      responseValueRenderOption: options?.responseValueRenderOption,
      responseDateTimeRenderOption: options?.responseDateTimeRenderOption
    });
    return response.data;
  }

  async appendValues(
    spreadsheetId: string,
    range: string,
    values: (string | number | boolean | null)[][],
    options?: {
      valueInputOption?: ValueInputOption;
      insertDataOption?: InsertDataOption;
      includeValuesInResponse?: boolean;
      responseValueRenderOption?: ValueRenderOption;
      responseDateTimeRenderOption?: DateTimeRenderOption;
    }
  ): Promise<AppendValuesResponse> {
    let params = {
      valueInputOption: options?.valueInputOption || 'USER_ENTERED',
      insertDataOption: options?.insertDataOption,
      includeValuesInResponse: options?.includeValuesInResponse,
      responseValueRenderOption: options?.responseValueRenderOption,
      responseDateTimeRenderOption: options?.responseDateTimeRenderOption
    };

    let response = await this.axios.post(
      `/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append`,
      { range, values },
      { params }
    );
    return response.data;
  }

  async clearValues(spreadsheetId: string, range: string): Promise<ClearValuesResponse> {
    let response = await this.axios.post(
      `/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`,
      {}
    );
    return response.data;
  }

  async batchClearValues(
    spreadsheetId: string,
    ranges: string[]
  ): Promise<{ spreadsheetId?: string; clearedRanges?: string[] }> {
    let response = await this.axios.post(`/spreadsheets/${spreadsheetId}/values:batchClear`, {
      ranges
    });
    return response.data;
  }

  // Formatting operations

  async formatCells(
    spreadsheetId: string,
    range: GridRange,
    format: CellFormat
  ): Promise<void> {
    await this.batchUpdate(spreadsheetId, [
      {
        repeatCell: {
          range,
          cell: {
            userEnteredFormat: format
          },
          fields: 'userEnteredFormat'
        }
      }
    ]);
  }

  async mergeCells(
    spreadsheetId: string,
    range: GridRange,
    mergeType: 'MERGE_ALL' | 'MERGE_COLUMNS' | 'MERGE_ROWS' = 'MERGE_ALL'
  ): Promise<void> {
    await this.batchUpdate(spreadsheetId, [
      {
        mergeCells: { range, mergeType }
      }
    ]);
  }

  async unmergeCells(spreadsheetId: string, range: GridRange): Promise<void> {
    await this.batchUpdate(spreadsheetId, [
      {
        unmergeCells: { range }
      }
    ]);
  }

  async updateBorders(
    spreadsheetId: string,
    range: GridRange,
    borders: {
      top?: {
        style?:
          | 'NONE'
          | 'DOTTED'
          | 'DASHED'
          | 'SOLID'
          | 'SOLID_MEDIUM'
          | 'SOLID_THICK'
          | 'DOUBLE';
        width?: number;
        color?: { red?: number; green?: number; blue?: number; alpha?: number };
      };
      bottom?: {
        style?:
          | 'NONE'
          | 'DOTTED'
          | 'DASHED'
          | 'SOLID'
          | 'SOLID_MEDIUM'
          | 'SOLID_THICK'
          | 'DOUBLE';
        width?: number;
        color?: { red?: number; green?: number; blue?: number; alpha?: number };
      };
      left?: {
        style?:
          | 'NONE'
          | 'DOTTED'
          | 'DASHED'
          | 'SOLID'
          | 'SOLID_MEDIUM'
          | 'SOLID_THICK'
          | 'DOUBLE';
        width?: number;
        color?: { red?: number; green?: number; blue?: number; alpha?: number };
      };
      right?: {
        style?:
          | 'NONE'
          | 'DOTTED'
          | 'DASHED'
          | 'SOLID'
          | 'SOLID_MEDIUM'
          | 'SOLID_THICK'
          | 'DOUBLE';
        width?: number;
        color?: { red?: number; green?: number; blue?: number; alpha?: number };
      };
      innerHorizontal?: {
        style?:
          | 'NONE'
          | 'DOTTED'
          | 'DASHED'
          | 'SOLID'
          | 'SOLID_MEDIUM'
          | 'SOLID_THICK'
          | 'DOUBLE';
        width?: number;
        color?: { red?: number; green?: number; blue?: number; alpha?: number };
      };
      innerVertical?: {
        style?:
          | 'NONE'
          | 'DOTTED'
          | 'DASHED'
          | 'SOLID'
          | 'SOLID_MEDIUM'
          | 'SOLID_THICK'
          | 'DOUBLE';
        width?: number;
        color?: { red?: number; green?: number; blue?: number; alpha?: number };
      };
    }
  ): Promise<void> {
    await this.batchUpdate(spreadsheetId, [
      {
        updateBorders: { range, ...borders }
      }
    ]);
  }

  // Conditional formatting

  async addConditionalFormatRule(
    spreadsheetId: string,
    rule: ConditionalFormatRule,
    index?: number
  ): Promise<void> {
    await this.batchUpdate(spreadsheetId, [
      {
        addConditionalFormatRule: { rule, index }
      }
    ]);
  }

  async deleteConditionalFormatRule(
    spreadsheetId: string,
    sheetId: number,
    index: number
  ): Promise<void> {
    await this.batchUpdate(spreadsheetId, [
      {
        deleteConditionalFormatRule: { sheetId, index }
      }
    ]);
  }

  // Row/Column operations

  async insertDimension(
    spreadsheetId: string,
    sheetId: number,
    dimension: 'ROWS' | 'COLUMNS',
    startIndex: number,
    endIndex: number,
    inheritFromBefore?: boolean
  ): Promise<void> {
    await this.batchUpdate(spreadsheetId, [
      {
        insertDimension: {
          range: { sheetId, dimension, startIndex, endIndex },
          inheritFromBefore
        }
      }
    ]);
  }

  async deleteDimension(
    spreadsheetId: string,
    sheetId: number,
    dimension: 'ROWS' | 'COLUMNS',
    startIndex: number,
    endIndex: number
  ): Promise<void> {
    await this.batchUpdate(spreadsheetId, [
      {
        deleteDimension: {
          range: { sheetId, dimension, startIndex, endIndex }
        }
      }
    ]);
  }

  async appendDimension(
    spreadsheetId: string,
    sheetId: number,
    dimension: 'ROWS' | 'COLUMNS',
    length: number
  ): Promise<void> {
    await this.batchUpdate(spreadsheetId, [
      {
        appendDimension: { sheetId, dimension, length }
      }
    ]);
  }

  async autoResizeDimensions(
    spreadsheetId: string,
    sheetId: number,
    dimension: 'ROWS' | 'COLUMNS',
    startIndex?: number,
    endIndex?: number
  ): Promise<void> {
    await this.batchUpdate(spreadsheetId, [
      {
        autoResizeDimensions: {
          dimensions: { sheetId, dimension, startIndex, endIndex }
        }
      }
    ]);
  }

  // Find and replace

  async findReplace(
    spreadsheetId: string,
    find: string,
    replacement: string,
    options?: {
      matchCase?: boolean;
      matchEntireCell?: boolean;
      searchByRegex?: boolean;
      includeFormulas?: boolean;
      range?: GridRange;
      sheetId?: number;
      allSheets?: boolean;
    }
  ): Promise<{
    valuesChanged?: number;
    formulasChanged?: number;
    rowsChanged?: number;
    sheetsChanged?: number;
    occurrencesChanged?: number;
  }> {
    let result = await this.batchUpdate(spreadsheetId, [
      {
        findReplace: {
          find,
          replacement,
          ...options
        }
      }
    ]);
    return result.replies?.[0]?.findReplace || {};
  }

  // Sort operations

  async sortRange(
    spreadsheetId: string,
    range: GridRange,
    sortSpecs: {
      dimensionIndex?: number;
      sortOrder?: 'ASCENDING' | 'DESCENDING';
    }[]
  ): Promise<void> {
    await this.batchUpdate(spreadsheetId, [
      {
        sortRange: { range, sortSpecs }
      }
    ]);
  }

  // Protected ranges

  async addProtectedRange(
    spreadsheetId: string,
    range: GridRange,
    options?: {
      description?: string;
      warningOnly?: boolean;
      editors?: {
        users?: string[];
        groups?: string[];
        domainUsersCanEdit?: boolean;
      };
    }
  ): Promise<number | undefined> {
    let result = await this.batchUpdate(spreadsheetId, [
      {
        addProtectedRange: {
          protectedRange: {
            range,
            ...options
          }
        }
      }
    ]);
    return result.replies?.[0]?.addProtectedRange?.protectedRange?.protectedRangeId;
  }

  async deleteProtectedRange(spreadsheetId: string, protectedRangeId: number): Promise<void> {
    await this.batchUpdate(spreadsheetId, [
      {
        deleteProtectedRange: { protectedRangeId }
      }
    ]);
  }

  // Named ranges

  async addNamedRange(
    spreadsheetId: string,
    name: string,
    range: GridRange
  ): Promise<string | undefined> {
    let result = await this.batchUpdate(spreadsheetId, [
      {
        addNamedRange: {
          namedRange: { name, range }
        }
      }
    ]);
    return result.replies?.[0]?.addNamedRange?.namedRange?.namedRangeId;
  }

  async deleteNamedRange(spreadsheetId: string, namedRangeId: string): Promise<void> {
    await this.batchUpdate(spreadsheetId, [
      {
        deleteNamedRange: { namedRangeId }
      }
    ]);
  }

  // Data validation

  async setDataValidation(
    spreadsheetId: string,
    range: GridRange,
    rule: {
      condition: {
        type: string;
        values?: { userEnteredValue?: string }[];
      };
      inputMessage?: string;
      strict?: boolean;
      showCustomUi?: boolean;
    }
  ): Promise<void> {
    await this.batchUpdate(spreadsheetId, [
      {
        setDataValidation: { range, rule }
      }
    ]);
  }

  // Copy/Cut paste

  async copyPaste(
    spreadsheetId: string,
    source: GridRange,
    destination: GridRange,
    pasteType?:
      | 'PASTE_NORMAL'
      | 'PASTE_VALUES'
      | 'PASTE_FORMAT'
      | 'PASTE_NO_BORDERS'
      | 'PASTE_FORMULA'
      | 'PASTE_DATA_VALIDATION'
      | 'PASTE_CONDITIONAL_FORMATTING',
    pasteOrientation?: 'NORMAL' | 'TRANSPOSE'
  ): Promise<void> {
    await this.batchUpdate(spreadsheetId, [
      {
        copyPaste: { source, destination, pasteType, pasteOrientation }
      }
    ]);
  }

  // Update spreadsheet properties

  async updateSpreadsheetProperties(
    spreadsheetId: string,
    properties: Partial<SpreadsheetProperties>,
    fields: string
  ): Promise<void> {
    await this.batchUpdate(spreadsheetId, [
      {
        updateSpreadsheetProperties: {
          properties: properties as SpreadsheetProperties,
          fields
        }
      }
    ]);
  }
}

// Drive client for watching file changes
export class DriveClient {
  private axios;

  constructor(token: string) {
    this.axios = createAxios({
      baseURL: 'https://www.googleapis.com/drive/v3'
    });
    this.axios.defaults.headers.common.Authorization = `Bearer ${token}`;
  }

  async watchFile(
    fileId: string,
    webhookUrl: string,
    channelId: string
  ): Promise<{
    resourceId?: string;
    resourceUri?: string;
    expiration?: string;
  }> {
    let response = await this.axios.post(`/files/${fileId}/watch`, {
      id: channelId,
      type: 'web_hook',
      address: webhookUrl,
      expiration: Date.now() + 24 * 60 * 60 * 1000 // 24 hours max
    });
    return response.data;
  }

  async stopChannel(channelId: string, resourceId: string): Promise<void> {
    await this.axios.post('/channels/stop', {
      id: channelId,
      resourceId
    });
  }

  async getFile(fileId: string): Promise<{
    id?: string;
    name?: string;
    mimeType?: string;
    modifiedTime?: string;
    createdTime?: string;
    owners?: { emailAddress?: string; displayName?: string }[];
  }> {
    let response = await this.axios.get(`/files/${fileId}`, {
      params: {
        fields: 'id,name,mimeType,modifiedTime,createdTime,owners(emailAddress,displayName)'
      }
    });
    return response.data;
  }
}
