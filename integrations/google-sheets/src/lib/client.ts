import { createAxios } from 'slates';
import { normalizeA1Range } from './a1-range';

export class SheetsClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.axios = createAxios({
      baseURL: 'https://sheets.googleapis.com/v4',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  // --- Spreadsheet Management ---

  async createSpreadsheet(params: { title: string; locale?: string; sheetTitles?: string[] }) {
    let sheets = params.sheetTitles?.map((title, index) => ({
      properties: { title, sheetId: index, index }
    }));

    let response = await this.axios.post('/spreadsheets', {
      properties: {
        title: params.title,
        locale: params.locale
      },
      sheets
    });

    return response.data;
  }

  async getSpreadsheet(spreadsheetId: string, includeGridData?: boolean) {
    let response = await this.axios.get(`/spreadsheets/${spreadsheetId}`, {
      params: {
        includeGridData: includeGridData ?? false,
        fields: includeGridData
          ? undefined
          : [
              'spreadsheetId',
              'spreadsheetUrl',
              'properties(title,locale,timeZone)',
              'sheets(properties(sheetId,title,index,sheetType,gridProperties(rowCount,columnCount,frozenRowCount,frozenColumnCount)))',
              'namedRanges(namedRangeId,name,range(sheetId,startRowIndex,endRowIndex,startColumnIndex,endColumnIndex))'
            ].join(',')
      }
    });
    return response.data;
  }

  async updateSpreadsheetProperties(
    spreadsheetId: string,
    properties: Record<string, any>,
    fields: string
  ) {
    let response = await this.axios.post(`/spreadsheets/${spreadsheetId}:batchUpdate`, {
      requests: [
        {
          updateSpreadsheetProperties: {
            properties,
            fields
          }
        }
      ]
    });
    return response.data;
  }

  // --- Reading Data ---

  async getValues(
    spreadsheetId: string,
    range: string,
    options?: {
      majorDimension?: 'ROWS' | 'COLUMNS';
      valueRenderOption?: 'FORMATTED_VALUE' | 'UNFORMATTED_VALUE' | 'FORMULA';
      dateTimeRenderOption?: 'SERIAL_NUMBER' | 'FORMATTED_STRING';
    }
  ) {
    let normalizedRange = normalizeA1Range(range);
    let response = await this.axios.get(
      `/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(normalizedRange)}`,
      { params: options }
    );
    return response.data;
  }

  async batchGetValues(
    spreadsheetId: string,
    ranges: string[],
    options?: {
      majorDimension?: 'ROWS' | 'COLUMNS';
      valueRenderOption?: 'FORMATTED_VALUE' | 'UNFORMATTED_VALUE' | 'FORMULA';
      dateTimeRenderOption?: 'SERIAL_NUMBER' | 'FORMATTED_STRING';
    }
  ) {
    let params = new URLSearchParams();
    for (let range of ranges) {
      params.append('ranges', normalizeA1Range(range));
    }
    if (options?.majorDimension !== undefined) {
      params.set('majorDimension', options.majorDimension);
    }
    if (options?.valueRenderOption !== undefined) {
      params.set('valueRenderOption', options.valueRenderOption);
    }
    if (options?.dateTimeRenderOption !== undefined) {
      params.set('dateTimeRenderOption', options.dateTimeRenderOption);
    }

    let response = await this.axios.get(`/spreadsheets/${spreadsheetId}/values:batchGet`, {
      params
    });
    return response.data;
  }

  // --- Writing Data ---

  async updateValues(
    spreadsheetId: string,
    range: string,
    values: any[][],
    options?: {
      valueInputOption?: 'RAW' | 'USER_ENTERED';
      includeValuesInResponse?: boolean;
      majorDimension?: 'ROWS' | 'COLUMNS';
    }
  ) {
    let valueInputOption = options?.valueInputOption ?? 'USER_ENTERED';
    let normalizedRange = normalizeA1Range(range);
    let response = await this.axios.put(
      `/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(normalizedRange)}`,
      {
        range: normalizedRange,
        majorDimension: options?.majorDimension ?? 'ROWS',
        values
      },
      {
        params: {
          valueInputOption,
          includeValuesInResponse: options?.includeValuesInResponse
        }
      }
    );
    return response.data;
  }

  async batchUpdateValues(
    spreadsheetId: string,
    data: { range: string; values: any[][] }[],
    options?: {
      valueInputOption?: 'RAW' | 'USER_ENTERED';
      includeValuesInResponse?: boolean;
    }
  ) {
    let valueInputOption = options?.valueInputOption ?? 'USER_ENTERED';
    let response = await this.axios.post(`/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
      valueInputOption,
      data: data.map(d => ({
        range: normalizeA1Range(d.range),
        majorDimension: 'ROWS',
        values: d.values
      })),
      includeValuesInResponse: options?.includeValuesInResponse
    });
    return response.data;
  }

  async appendValues(
    spreadsheetId: string,
    range: string,
    values: any[][],
    options?: {
      valueInputOption?: 'RAW' | 'USER_ENTERED';
      insertDataOption?: 'OVERWRITE' | 'INSERT_ROWS';
      includeValuesInResponse?: boolean;
    }
  ) {
    let valueInputOption = options?.valueInputOption ?? 'USER_ENTERED';
    let normalizedRange = normalizeA1Range(range);
    let response = await this.axios.post(
      `/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(normalizedRange)}:append`,
      {
        range: normalizedRange,
        majorDimension: 'ROWS',
        values
      },
      {
        params: {
          valueInputOption,
          insertDataOption: options?.insertDataOption ?? 'INSERT_ROWS',
          includeValuesInResponse: options?.includeValuesInResponse
        }
      }
    );
    return response.data;
  }

  async clearValues(spreadsheetId: string, range: string) {
    let normalizedRange = normalizeA1Range(range);
    let response = await this.axios.post(
      `/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(normalizedRange)}:clear`
    );
    return response.data;
  }

  // --- Batch Update (for formatting, sheet management, charts, etc.) ---

  async batchUpdate(spreadsheetId: string, requests: any[]) {
    let response = await this.axios.post(`/spreadsheets/${spreadsheetId}:batchUpdate`, {
      requests
    });
    return response.data;
  }

  // --- Sheet Management helpers ---

  async addSheet(spreadsheetId: string, properties: Record<string, any>) {
    return this.batchUpdate(spreadsheetId, [{ addSheet: { properties } }]);
  }

  async deleteSheet(spreadsheetId: string, sheetId: number) {
    return this.batchUpdate(spreadsheetId, [{ deleteSheet: { sheetId } }]);
  }

  async duplicateSheet(
    spreadsheetId: string,
    sourceSheetId: number,
    newSheetName?: string,
    insertSheetIndex?: number
  ) {
    return this.batchUpdate(spreadsheetId, [
      {
        duplicateSheet: {
          sourceSheetId,
          insertSheetIndex,
          newSheetName
        }
      }
    ]);
  }

  async updateSheetProperties(
    spreadsheetId: string,
    properties: Record<string, any>,
    fields: string
  ) {
    return this.batchUpdate(spreadsheetId, [
      {
        updateSheetProperties: {
          properties,
          fields
        }
      }
    ]);
  }
}
