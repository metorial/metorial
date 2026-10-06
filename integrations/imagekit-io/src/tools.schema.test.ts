import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';

describeMcpCompatibleToolSchemas('ImageKit tool input schemas', provider.actions);
const legacy = [
  'upload_file',
  'list_files',
  'get_file',
  'update_file',
  'delete_files',
  'copy_move_file',
  'manage_tags',
  'manage_custom_metadata_fields',
  'get_file_metadata',
  'purge_cache',
  'manage_folders',
  'manage_file_versions'
];
describe('ImageKit compatibility', () => {
  it('preserves all12 keys and only two approved additions plus reserved renewal', () => {
    const keys = provider.actions.map(a => a.key);
    for (const key of [
      ...legacy,
      'download_file',
      'get_bulk_job_status',
      'metorial$getFileUrl'
    ])
      expect(keys).toContain(key);
    expect(keys).toHaveLength(15);
  });
  it('keeps all production IDs below60 characters', () => {
    for (const a of provider.actions) expect(`imagekit-${a.key}`.length).toBeLessThan(60);
  });
  it.each([
    ['manage_folders', ['create', 'delete', 'copy', 'move']],
    ['manage_file_versions', ['list', 'get', 'delete', 'restore']],
    ['manage_custom_metadata_fields', ['list', 'create', 'update', 'delete']],
    ['manage_tags', ['add', 'remove', 'remove_ai']],
    ['copy_move_file', ['copy', 'move', 'rename']],
    ['purge_cache', ['purge', 'status']]
  ])('preserves %s operations', (key, operations) => {
    const action = provider.actions.find(a => a.key === key)!;
    for (const operation of operations)
      expect(
        action.inputSchema.safeParse({
          operation,
          fileId: 'file1',
          sourceFilePath: '/a.jpg',
          fileIds: ['file1'],
          tags: ['test']
        }).success
      ).toBe(true);
  });
  it('preserves numeric pagination and string IDs', () => {
    expect(
      provider.actions
        .find(a => a.key === 'list_files')!
        .inputSchema.safeParse({ skip: 0, limit: 1 }).success
    ).toBe(true);
    expect(
      provider.actions
        .find(a => a.key === 'get_file')!
        .inputSchema.safeParse({ fileId: '12345' }).success
    ).toBe(true);
    expect(
      provider.actions
        .find(a => a.key === 'get_file')!
        .inputSchema.safeParse({ fileId: 12345 }).success
    ).toBe(false);
  });
  it('allows documented queued uploads without fabricated file IDs', () => {
    expect(
      provider.actions
        .find(a => a.key === 'upload_file')!
        .outputSchema.safeParse({ status: 'queued' }).success
    ).toBe(true);
  });
});
