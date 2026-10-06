import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { auth } from './auth';
import { config } from './config';
import { provider } from './index';

const legacy = [
  'convert_file',
  'optimize_file',
  'add_watermark',
  'capture_website',
  'generate_thumbnail',
  'merge_files',
  'extract_metadata',
  'create_archive',
  'process_pdf',
  'get_job',
  'list_jobs',
  'list_formats',
  'create_job'
];
describeMcpCompatibleToolSchemas('CloudConvert tool inputs', provider.actions);
const action = (key: string) => {
  const value = provider.actions.find(action => action.key === key);
  if (!value) throw new Error('Missing schema contract action');
  return value;
};
describe('CloudConvert compatibility contracts', () => {
  it('retains 13 keys and only four approved additions', () => {
    expect(provider.actions.map(action => action.key).sort()).toEqual(
      [...legacy, 'get_current_user', 'manage_task', 'delete_job', 'download_job_files'].sort()
    );
    expect(provider.actions.every(action => `cloudconvert-${action.key}`.length < 60)).toBe(
      true
    );
    expect(provider.triggerGroups).toHaveLength(0);
    expect(provider.actions.every(action => action.type === 'tool')).toBe(true);
  });
  it('preserves the legacy PDF and waiting enum values for runtime validation', () => {
    for (const operation of [
      'ocr',
      'encrypt',
      'decrypt',
      'split',
      'extract',
      'rotate',
      'pdfa'
    ])
      expect(
        action('process_pdf').inputSchema.safeParse({
          sourceUrl: 'https://example.invalid/a.pdf',
          operation
        }).success
      ).toBe(true);
    expect(action('list_jobs').inputSchema.safeParse({ status: 'waiting' }).success).toBe(
      true
    );
  });
  it('preserves legacy defaults and job/task output fields', () => {
    expect(
      action('convert_file').inputSchema.parse({
        sourceUrl: 'https://example.invalid/a.pdf',
        outputFormat: 'png'
      })
    ).toMatchObject({ waitForCompletion: true });
    expect(action('create_job').inputSchema.parse({ tasks: {} })).toMatchObject({
      waitForCompletion: false
    });
    expect(action('get_job').inputSchema.parse({ jobId: 'job-1' })).toMatchObject({
      waitForCompletion: false
    });
    expect(
      action('get_job').outputSchema?.safeParse({
        jobId: 'job-1',
        status: 'processing',
        tasks: [{ taskId: 'task-1', operation: 'convert', status: 'processing' }]
      }).success
    ).toBe(true);
  });
  it('keeps branch schemas as objects and retains the legacy webhook field', () => {
    for (const actionValue of ['get', 'list', 'cancel', 'retry', 'delete'])
      expect(
        action('manage_task').inputSchema.safeParse({ action: actionValue }).success
      ).toBe(true);
    expect(
      action('create_job').inputSchema.safeParse({
        tasks: { file: { operation: 'import/url', url: 'https://example.invalid/a.pdf' } },
        webhookEvents: ['job.finished']
      }).success
    ).toBe(true);
  });
  it('moves environment to authentication and preserves saved legacy config', () => {
    expect(config.configSchema.parse({ environment: 'sandbox' })).toMatchObject({
      environment: 'sandbox'
    });
    expect(Object.keys(config.configSchema.toJSONSchema().properties ?? {})).not.toContain(
      'environment'
    );
    for (const method of auth.authStack)
      expect(
        method.inputSchema?.safeParse({ token: 'synthetic-key', environment: 'sandbox' })
          .success
      ).toBe(true);
  });
});
