import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';

describeMcpCompatibleToolSchemas('Buildkite tool input schemas', provider.actions);
describe('Buildkite retained tool contracts', () => {
  it('retains legacy log inspection alongside the file download replacement', () => {
    const old = provider.actions.find(action => action.key === 'get_job_log');
    expect(old?.tags?.deprecated).toBe(true);
    expect(old?.description).toContain('DEPRECATED — use `download_job_log` instead.');
    expect(provider.actions.some(action => action.key === 'download_job_log')).toBe(true);
    if (!old || old.type !== 'tool') throw new Error('Legacy log tool is missing.');
    const input = z.toJSONSchema(old.inputSchema);
    expect(input.required).toEqual(['pipelineSlug', 'buildNumber', 'jobId']);
    expect(input.properties).toMatchObject({
      pipelineSlug: { type: 'string' },
      buildNumber: { type: 'number' },
      jobId: { type: 'string' },
      includeEnvironment: { type: 'boolean' }
    });
    const output = z.toJSONSchema(old.outputSchema);
    expect(output.required).toEqual(['content', 'size', 'headerTimes']);
    expect(output.properties).toMatchObject({
      content: { type: 'string' },
      size: { type: 'number' },
      headerTimes: { type: 'array', items: { type: 'number' } },
      environment: { type: 'object' }
    });
  });
  it('preserves numeric inputs as JSON Schema numbers', () => {
    for (const action of provider.actions) {
      if (action.type !== 'tool') continue;
      const fields = z.toJSONSchema(action.inputSchema).properties ?? {};
      for (const key of ['page', 'perPage', 'buildNumber'])
        if (fields[key]) expect(fields[key]).toMatchObject({ type: 'number' });
    }
  });
});
