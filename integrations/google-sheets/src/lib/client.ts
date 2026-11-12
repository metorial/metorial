import { createApiServiceError, createAxios } from 'slates';
import { z } from 'zod';
import { normalizeA1Range, quoteA1SheetName } from './a1-range';

const MAX_SHEET_TITLES_IN_HINT = 20;
const MAX_SHEET_TITLES_HINT_LENGTH = 1000;
const MAX_UPSTREAM_DETAIL_LENGTH = 300;
// A selection holds at most 100,000 cells but a cell can hold 50,000 characters.
export const MAX_ROW_OBSERVATION_RESPONSE_BYTES = 64 * 1024 * 1024;
const rowObservationSheetListSchema = z.object({
  spreadsheetId: z.string(),
  sheets: z.array(
    z.object({
      properties: z.object({
        sheetId: z.number().int().nonnegative(),
        title: z.string().min(1)
      })
    })
  )
});

const isUnparseableRangeError = (error: unknown): error is Error =>
  error instanceof Error && /unable to parse range/i.test(error.message);

const truncate = (value: string, maxLength: number) =>
  value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;

const formatSheetTitles = (titles: string[]) => {
  let unique = [...new Set(titles)];
  let listed: string[] = [];
  let length = 0;

  for (let title of unique) {
    let quoted = JSON.stringify(title);
    if (
      listed.length >= MAX_SHEET_TITLES_IN_HINT ||
      length + quoted.length > MAX_SHEET_TITLES_HINT_LENGTH
    ) {
      break;
    }
    listed.push(quoted);
    length += quoted.length + 2;
  }

  let remaining = unique.length - listed.length;
  return remaining > 0 ? `${listed.join(', ')} (and ${remaining} more)` : listed.join(', ');
};

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

  // Google answers "Unable to parse range" both for malformed A1 notation and for
  // sheet names that do not exist, without saying which sheets do exist. Agents
  // then retry blind, so list the spreadsheet's actual tab titles in the error.
  private async withRangeErrorHint<T>(spreadsheetId: string, request: () => Promise<T>) {
    try {
      return await request();
    } catch (error) {
      if (!isUnparseableRangeError(error)) throw error;

      let titles: string[];
      try {
        let response = await this.axios.get(`/spreadsheets/${spreadsheetId}`, {
          params: { fields: 'sheets.properties.title' }
        });
        titles = (response.data?.sheets ?? [])
          .map((sheet: any) => sheet?.properties?.title)
          .filter((title: unknown): title is string => typeof title === 'string');
      } catch {
        throw error;
      }

      let available =
        titles.length > 0
          ? ` Available sheets: ${formatSheetTitles(titles)}.`
          : ' The spreadsheet has no sheets.';

      let detail = truncate(error.message.trim(), MAX_UPSTREAM_DETAIL_LENGTH);

      throw createApiServiceError(
        `Google Sheets could not resolve the range: ${detail}${/[.!?]$/.test(detail) ? '' : '.'} Make sure the sheet name (or named range) exactly matches an existing one and the range uses A1 notation, e.g. "'Sheet Name'!A1:B10".${available}`,
        {
          reason: 'google_sheets_invalid_range',
          upstreamStatus: 400,
          parent: error
        }
      );
    }
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

  async getRowObservationGrid(
    spreadsheetId: string,
    selection: { sheetId: number; range: string }
  ): Promise<unknown> {
    const path = `/spreadsheets/${encodeURIComponent(spreadsheetId)}`;
    // spreadsheets.get accepts spreadsheets.readonly (getByDataFilter does not); the poller checks the ID.
    const metadata = await this.axios.get(path, {
      params: { fields: 'spreadsheetId,sheets.properties(sheetId,title)' }
    });
    const parsed = rowObservationSheetListSchema.safeParse(metadata.data);
    if (!parsed.success || parsed.data.spreadsheetId !== spreadsheetId) {
      throw createApiServiceError(
        'Google Sheets returned invalid sheet metadata. The previous row baseline was preserved.',
        { reason: 'google_sheets_row_metadata_invalid' }
      );
    }
    const matches = parsed.data.sheets.filter(
      sheet => sheet.properties.sheetId === selection.sheetId
    );
    const sheet = matches[0];
    if (matches.length !== 1 || !sheet) {
      throw createApiServiceError(
        'Google Sheets did not return the selected sheet ID. The previous row baseline was preserved.',
        { reason: 'google_sheets_row_sheet_missing' }
      );
    }
    const response = await this.axios.get(path, {
      params: {
        ranges: `${quoteA1SheetName(sheet.properties.title)}!${selection.range}`,
        fields:
          'spreadsheetId,sheets(properties(sheetId,title,sheetType,gridProperties(rowCount,columnCount)),data(startRow,startColumn,rowData(values(userEnteredValue))))'
      },
      maxContentLength: MAX_ROW_OBSERVATION_RESPONSE_BYTES
    });
    return response.data;
  }

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
    let response = await this.withRangeErrorHint(spreadsheetId, () =>
      this.axios.get(
        `/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(normalizedRange)}`,
        { params: options }
      )
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

    let response = await this.withRangeErrorHint(spreadsheetId, () =>
      this.axios.get(`/spreadsheets/${spreadsheetId}/values:batchGet`, { params })
    );
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
    let response = await this.withRangeErrorHint(spreadsheetId, () =>
      this.axios.put(
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
      )
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
    let response = await this.withRangeErrorHint(spreadsheetId, () =>
      this.axios.post(`/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
        valueInputOption,
        data: data.map(d => ({
          range: normalizeA1Range(d.range),
          majorDimension: 'ROWS',
          values: d.values
        })),
        includeValuesInResponse: options?.includeValuesInResponse
      })
    );
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
    let response = await this.withRangeErrorHint(spreadsheetId, () =>
      this.axios.post(
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
      )
    );
    return response.data;
  }

  async clearValues(spreadsheetId: string, range: string) {
    let normalizedRange = normalizeA1Range(range);
    let response = await this.withRangeErrorHint(spreadsheetId, () =>
      this.axios.post(
        `/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(normalizedRange)}:clear`
      )
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

  async copySheetToSpreadsheet(
    spreadsheetId: string,
    sheetId: number,
    destinationSpreadsheetId: string
  ) {
    let response = await this.axios.post(
      `/spreadsheets/${encodeURIComponent(spreadsheetId)}/sheets/${sheetId}:copyTo`,
      { destinationSpreadsheetId }
    );
    return response.data;
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
