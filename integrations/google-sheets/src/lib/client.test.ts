import { beforeEach, describe, expect, it, vi } from 'vitest';

let sheetsAxiosMocks = vi.hoisted(() => ({
  post: vi.fn()
}));

vi.mock('slates', async () => {
  let actual = await vi.importActual<typeof import('slates')>('slates');
  return {
    ...actual,
    createAxios: vi.fn(() => sheetsAxiosMocks)
  };
});

import { SheetsClient } from './client';

describe('SheetsClient sheet copy endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sheetsAxiosMocks.post.mockResolvedValue({
      data: { sheetId: 37, title: 'Copy of Source' }
    });
  });

  it('posts to spreadsheets.sheets.copyTo with the destination spreadsheet ID', async () => {
    let client = new SheetsClient('test-token');

    let result = await client.copySheetToSpreadsheet(
      'source-spreadsheet',
      12,
      'destination-spreadsheet'
    );

    expect(sheetsAxiosMocks.post).toHaveBeenCalledWith(
      '/spreadsheets/source-spreadsheet/sheets/12:copyTo',
      { destinationSpreadsheetId: 'destination-spreadsheet' }
    );
    expect(result).toEqual({ sheetId: 37, title: 'Copy of Source' });
  });

  it('URL-encodes the source spreadsheet ID in the copyTo path', async () => {
    let client = new SheetsClient('test-token');

    await client.copySheetToSpreadsheet(
      'source/spread sheet#1',
      12,
      'destination-spreadsheet'
    );

    expect(sheetsAxiosMocks.post).toHaveBeenCalledWith(
      '/spreadsheets/source%2Fspread%20sheet%231/sheets/12:copyTo',
      { destinationSpreadsheetId: 'destination-spreadsheet' }
    );
  });
});
