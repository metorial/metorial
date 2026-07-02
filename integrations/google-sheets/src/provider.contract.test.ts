import { createLocalSlateTestClient, expectSlateContract } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';
import { googleSheetsActionScopes } from './scopes';

describe('google-sheets provider contract', () => {
  it('exposes the expected provider, tool, trigger, and auth surface', async () => {
    let client = createLocalSlateTestClient({ slate: provider });
    let contract = await expectSlateContract({
      client,
      provider: {
        id: 'google-sheets',
        name: 'Google Sheets',
        description:
          'Cloud-based spreadsheet application that is part of Google Workspace. Create, read, update, and manage spreadsheets with support for cell formatting, charts, pivot tables, data validation, and more.'
      },
      toolIds: [
        'create_spreadsheet',
        'get_spreadsheet',
        'update_spreadsheet',
        'delete_spreadsheet',
        'read_cells',
        'write_cells',
        'clear_cells',
        'manage_sheets',
        'format_cells',
        'batch_update',
        'create_chart',
        'create_pivot_table',
        'set_data_validation',
        'manage_protected_ranges',
        'manage_named_ranges',
        'create_filter_view',
        'merge_cells'
      ],
      triggerIds: ['spreadsheet_changed'],
      authMethodIds: ['oauth', 'api_key', 'service_account'],
      tools: [
        { id: 'create_spreadsheet', readOnly: false, destructive: false },
        { id: 'get_spreadsheet', readOnly: true, destructive: false },
        { id: 'update_spreadsheet', readOnly: false, destructive: false },
        { id: 'delete_spreadsheet', readOnly: false, destructive: true },
        { id: 'read_cells', readOnly: true, destructive: false },
        { id: 'write_cells', readOnly: false, destructive: false },
        { id: 'clear_cells', readOnly: false, destructive: true },
        { id: 'manage_sheets', readOnly: false, destructive: false },
        { id: 'format_cells', readOnly: false, destructive: false },
        { id: 'batch_update', readOnly: false, destructive: false },
        { id: 'create_chart', readOnly: false, destructive: false },
        { id: 'create_pivot_table', readOnly: false, destructive: false },
        { id: 'set_data_validation', readOnly: false, destructive: false },
        { id: 'manage_protected_ranges', readOnly: false, destructive: false },
        { id: 'manage_named_ranges', readOnly: false, destructive: false },
        { id: 'create_filter_view', readOnly: false, destructive: false },
        { id: 'merge_cells', readOnly: false, destructive: false }
      ],
      triggers: [{ id: 'spreadsheet_changed', invocationType: 'webhook' }]
    });

    expect(contract.actions).toHaveLength(18);

    let expectedScopes = {
      create_spreadsheet: googleSheetsActionScopes.createSpreadsheet,
      get_spreadsheet: googleSheetsActionScopes.getSpreadsheet,
      update_spreadsheet: googleSheetsActionScopes.updateSpreadsheet,
      delete_spreadsheet: googleSheetsActionScopes.deleteSpreadsheet,
      read_cells: googleSheetsActionScopes.readCells,
      write_cells: googleSheetsActionScopes.writeCells,
      clear_cells: googleSheetsActionScopes.clearCells,
      manage_sheets: googleSheetsActionScopes.manageSheets,
      format_cells: googleSheetsActionScopes.formatCells,
      batch_update: googleSheetsActionScopes.batchUpdate,
      create_chart: googleSheetsActionScopes.createChart,
      create_pivot_table: googleSheetsActionScopes.createPivotTable,
      set_data_validation: googleSheetsActionScopes.setDataValidation,
      manage_protected_ranges: googleSheetsActionScopes.manageProtectedRanges,
      manage_named_ranges: googleSheetsActionScopes.manageNamedRanges,
      create_filter_view: googleSheetsActionScopes.createFilterView,
      merge_cells: googleSheetsActionScopes.mergeCells,
      spreadsheet_changed: googleSheetsActionScopes.spreadsheetChanged
    };

    for (let [actionId, scopes] of Object.entries(expectedScopes)) {
      expect(contract.actions.find(action => action.id === actionId)?.scopes).toEqual(scopes);
    }

    let oauth = await client.getAuthMethod('oauth');
    expect(oauth.authenticationMethod.type).toBe('auth.oauth');
    expect(oauth.authenticationMethod.capabilities.handleTokenRefresh?.enabled).toBe(true);
    expect(oauth.authenticationMethod.capabilities.getProfile?.enabled).toBe(true);

    let scopeTitles = new Set(
      (oauth.authenticationMethod.scopes ?? []).map(scope => scope.title)
    );
    expect(scopeTitles.has('Spreadsheets (Full)')).toBe(true);
    expect(scopeTitles.has('User Email')).toBe(true);
  });
});
