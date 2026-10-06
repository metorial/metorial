import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';

describeMcpCompatibleToolSchemas('Travis CI input schemas', provider.actions);
describe('Travis CI public compatibility', () => {
  it('retains every established tool key', () => {
    for (const key of [
      'list_repositories',
      'get_repository',
      'list_builds',
      'get_build',
      'trigger_build',
      'manage_build',
      'manage_job',
      'get_job_log',
      'manage_env_vars',
      'manage_crons',
      'manage_caches',
      'list_branches',
      'lint_travis_yml',
      'list_build_requests'
    ])
      expect(provider.actions.some(tool => tool.key === key)).toBe(true);
  });
  it('retains the legacy log schema and marks its genuine replacement', () => {
    const old = provider.actions.find(tool => tool.key === 'get_job_log');
    const replacement = provider.actions.find(tool => tool.key === 'manage_job_log');
    expect(old?.tags?.deprecated).toBe(true);
    expect(old?.description).toContain('DEPRECATED — use `manage_job_log` instead.');
    expect(replacement).toBeDefined();
    if (!old || old.type !== 'tool' || !old.outputSchema)
      throw new Error('Missing legacy log tool');
    expect(z.toJSONSchema(old.inputSchema).properties?.action).toMatchObject({
      enum: ['get', 'delete']
    });
    expect(z.toJSONSchema(old.outputSchema).properties).toHaveProperty('content');
  });
  it('preserves established pagination number schemas', () => {
    for (const key of [
      'list_repositories',
      'list_builds',
      'list_build_requests',
      'list_branches'
    ]) {
      const tool = provider.actions.find(tool => tool.key === key);
      if (!tool || tool.type !== 'tool') throw new Error(`Missing ${key}`);
      expect(z.toJSONSchema(tool.inputSchema).properties?.limit).toMatchObject({
        type: 'number'
      });
      expect(z.toJSONSchema(tool.inputSchema).properties?.offset).toMatchObject({
        type: 'number'
      });
    }
  });
  it('preserves build state filters and adds queued', () => {
    const tool = provider.actions.find(tool => tool.key === 'list_builds');
    if (!tool || tool.type !== 'tool') throw new Error('Missing list_builds');
    expect(z.toJSONSchema(tool.inputSchema).properties?.state).toMatchObject({
      enum: [
        'created',
        'queued',
        'received',
        'started',
        'passed',
        'failed',
        'errored',
        'canceled'
      ]
    });
  });
});
