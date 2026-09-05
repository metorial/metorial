import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';
import { hostedMcpInputSchemas } from './lib/mcp-schemas';

describeMcpCompatibleToolSchemas('Amplitude tool input schemas', provider.actions);

describe('Amplitude hosted input contracts', () => {
  it('accepts typed chart definitions returned by Amplitude, including its measured_as alias', () => {
    expect(
      hostedMcpInputSchemas.query_amplitude_data.safeParse({
        projectId: '123',
        chart: {
          kind: 'segmentation',
          events: [{ event: 'Checkout Completed' }],
          measured_as: { as_: 'unique_users' },
          date_range: { relative: 'Last 30 Days' },
          name: 'Checkout users'
        }
      }).success
    ).toBe(true);
  });

  it('exposes only event reads and rejects mutation fields', () => {
    const schema = hostedMcpInputSchemas.manage_amp_events;
    expect(schema.safeParse({ action: 'get', projectId: '123', kind: 'event' }).success).toBe(
      true
    );
    for (const action of ['create', 'update', 'delete', 'restore']) {
      expect(schema.safeParse({ action, projectId: '123' }).success).toBe(false);
    }
    expect(
      schema.safeParse({ action: 'get', descriptions: { Purchase: 'Changed' } }).success
    ).toBe(false);
  });

  it('keeps consolidated upstream write actions out of read aliases', () => {
    expect(
      hostedMcpInputSchemas.get_experiments.safeParse({ ids: ['1'], action: 'create' }).success
    ).toBe(false);
    expect(
      hostedMcpInputSchemas.get_flags.safeParse({ flagIds: ['1'], action: 'update' }).success
    ).toBe(false);
    expect(hostedMcpInputSchemas.get_properties.safeParse({ action: 'events' }).success).toBe(
      false
    );
  });

  it('requires persisted-save names and descriptions and models nested destinations', () => {
    expect(
      hostedMcpInputSchemas.save_chart_edits.safeParse({
        charts: [{ editId: 'edit', name: 'Checkout', description: '' }],
        destination: { kind: 'personal' }
      }).success
    ).toBe(true);
    expect(
      hostedMcpInputSchemas.save_chart_edits.safeParse({
        charts: [{ editId: 'edit', name: 'Checkout' }]
      }).success
    ).toBe(false);
    expect(
      hostedMcpInputSchemas.save_chart_edits.safeParse({
        charts: [{ editId: 'edit', name: 'Checkout', description: '' }],
        destination: { kind: 'space' }
      }).success
    ).toBe(false);
  });
});
