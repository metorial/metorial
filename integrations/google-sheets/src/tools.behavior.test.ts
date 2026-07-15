import { createLocalSlateTestClient, expectSlateError } from '@slates/test';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let sheetsClientMocks = vi.hoisted(() => ({
  addSheet: vi.fn(),
  copySheetToSpreadsheet: vi.fn(),
  deleteSheet: vi.fn(),
  duplicateSheet: vi.fn(),
  updateSheetProperties: vi.fn()
}));

vi.mock('./lib/client', () => ({
  SheetsClient: class {
    addSheet(...args: unknown[]) {
      return sheetsClientMocks.addSheet(...args);
    }

    copySheetToSpreadsheet(...args: unknown[]) {
      return sheetsClientMocks.copySheetToSpreadsheet(...args);
    }

    deleteSheet(...args: unknown[]) {
      return sheetsClientMocks.deleteSheet(...args);
    }

    duplicateSheet(...args: unknown[]) {
      return sheetsClientMocks.duplicateSheet(...args);
    }

    updateSheetProperties(...args: unknown[]) {
      return sheetsClientMocks.updateSheetProperties(...args);
    }
  }
}));

import { provider } from './index';

let createSheetsToolTestClient = () =>
  createLocalSlateTestClient({
    slate: provider as any,
    state: {
      config: {},
      auth: {
        authenticationMethodId: 'oauth',
        output: { token: 'test-token' }
      }
    }
  });

describe('manage_sheets behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('copies a source sheet into another spreadsheet', async () => {
    sheetsClientMocks.copySheetToSpreadsheet.mockResolvedValue({
      sheetId: 37,
      title: 'Copy of Source'
    });
    let client = createSheetsToolTestClient();

    let result = await client.invokeTool('manage_sheets', {
      spreadsheetId: 'source-spreadsheet',
      action: 'copy_to_spreadsheet',
      sourceSheetId: 12,
      destinationSpreadsheetId: 'destination-spreadsheet'
    });

    expect(sheetsClientMocks.copySheetToSpreadsheet).toHaveBeenCalledWith(
      'source-spreadsheet',
      12,
      'destination-spreadsheet'
    );
    expect(result.output).toEqual({
      sheetId: 37,
      title: 'Copy of Source',
      destinationSpreadsheetId: 'destination-spreadsheet',
      action: 'copy_to_spreadsheet'
    });
  });

  it('requires the source sheet ID for a cross-spreadsheet copy', async () => {
    let client = createSheetsToolTestClient();

    await expectSlateError(
      () =>
        client.invokeTool('manage_sheets', {
          spreadsheetId: 'source-spreadsheet',
          action: 'copy_to_spreadsheet',
          destinationSpreadsheetId: 'destination-spreadsheet'
        }),
      'sourceSheetId is required for copy_to_spreadsheet'
    );
    expect(sheetsClientMocks.copySheetToSpreadsheet).not.toHaveBeenCalled();
  });

  it('requires the destination spreadsheet ID for a cross-spreadsheet copy', async () => {
    let client = createSheetsToolTestClient();

    await expectSlateError(
      () =>
        client.invokeTool('manage_sheets', {
          spreadsheetId: 'source-spreadsheet',
          action: 'copy_to_spreadsheet',
          sourceSheetId: 12
        }),
      'destinationSpreadsheetId is required for copy_to_spreadsheet'
    );
    expect(sheetsClientMocks.copySheetToSpreadsheet).not.toHaveBeenCalled();
  });

  it('preserves add, delete, duplicate, and update behavior', async () => {
    sheetsClientMocks.addSheet.mockResolvedValue({
      replies: [{ addSheet: { properties: { sheetId: 21, title: 'Added' } } }]
    });
    sheetsClientMocks.deleteSheet.mockResolvedValue({});
    sheetsClientMocks.duplicateSheet.mockResolvedValue({
      replies: [{ duplicateSheet: { properties: { sheetId: 22, title: 'Duplicated' } } }]
    });
    sheetsClientMocks.updateSheetProperties.mockResolvedValue({});
    let client = createSheetsToolTestClient();

    await client.invokeTool('manage_sheets', {
      spreadsheetId: 'spreadsheet-1',
      action: 'add',
      title: 'Added'
    });
    await client.invokeTool('manage_sheets', {
      spreadsheetId: 'spreadsheet-1',
      action: 'delete',
      sheetId: 21
    });
    await client.invokeTool('manage_sheets', {
      spreadsheetId: 'spreadsheet-1',
      action: 'duplicate',
      sourceSheetId: 21,
      newSheetName: 'Duplicated'
    });
    await client.invokeTool('manage_sheets', {
      spreadsheetId: 'spreadsheet-1',
      action: 'update',
      sheetId: 21,
      title: 'Renamed'
    });

    expect(sheetsClientMocks.addSheet).toHaveBeenCalledWith('spreadsheet-1', {
      title: 'Added'
    });
    expect(sheetsClientMocks.deleteSheet).toHaveBeenCalledWith('spreadsheet-1', 21);
    expect(sheetsClientMocks.duplicateSheet).toHaveBeenCalledWith(
      'spreadsheet-1',
      21,
      'Duplicated',
      undefined
    );
    expect(sheetsClientMocks.updateSheetProperties).toHaveBeenCalledWith(
      'spreadsheet-1',
      { sheetId: 21, title: 'Renamed' },
      'title'
    );
  });
});
