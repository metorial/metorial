import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';
import {
  createBoard,
  downloadLogExport,
  exportLogs,
  getUsage,
  suspendIngestion
} from './tools';

describeMcpCompatibleToolSchemas('LogDNA tool input schemas', provider.actions);
describe('LogDNA compatibility and deprecation contracts', () => {
  it('preserves the thirty established tool keys', () => {
    const keys = provider.actions.map(action => action.key);
    for (const key of [
      'ingest_logs',
      'export_logs',
      'list_views',
      'get_view',
      'create_view',
      'update_view',
      'delete_view',
      'list_preset_alerts',
      'create_preset_alert',
      'update_preset_alert',
      'delete_preset_alert',
      'list_boards',
      'get_board',
      'create_board',
      'delete_board',
      'list_exclusion_rules',
      'create_exclusion_rule',
      'update_exclusion_rule',
      'delete_exclusion_rule',
      'get_archive_config',
      'save_archive_config',
      'delete_archive_config',
      'list_categories',
      'create_category',
      'update_category',
      'delete_category',
      'get_ingestion_status',
      'suspend_ingestion',
      'resume_ingestion',
      'get_usage'
    ])
      expect(keys).toContain(key);
  });
  it('retains legacy export while directing new downloads to the replacement', () => {
    expect(provider.actions).toContain(exportLogs);
    expect(provider.actions).toContain(downloadLogExport);
    expect(exportLogs.tags?.deprecated).toBe(true);
    expect(exportLogs.description).toMatch(
      /^DEPRECATED — use `download_log_export` instead\./
    );
    expect(exportLogs.instructions?.join(' ')).toContain('download_log_export');
    expect(z.toJSONSchema(exportLogs.outputSchema).properties?.lines).toMatchObject({
      type: 'string'
    });
    expect(z.toJSONSchema(downloadLogExport.outputSchema).properties).not.toHaveProperty(
      'lines'
    );
  });
  it('retains existing field types and enum values on repaired tools', () => {
    expect(z.toJSONSchema(exportLogs.inputSchema).properties?.tags).toMatchObject({
      type: 'string'
    });
    expect(z.toJSONSchema(createBoard.inputSchema).properties?.widgets).toMatchObject({
      type: 'array'
    });
    expect(z.toJSONSchema(getUsage.inputSchema).properties?.from).toMatchObject({
      type: 'number'
    });
    expect(z.toJSONSchema(getUsage.inputSchema).properties?.breakdown).toMatchObject({
      enum: ['apps', 'hosts', 'tags']
    });
    expect(z.toJSONSchema(suspendIngestion.inputSchema).properties?.confirm).toMatchObject({
      type: 'boolean'
    });
  });
});
