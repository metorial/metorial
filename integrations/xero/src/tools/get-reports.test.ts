import { ServiceError } from '@lowerdeck/error';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

let clientMocks = vi.hoisted(() => ({
  getReport: vi.fn()
}));

vi.mock('../lib/helpers', () => ({
  createClientFromContext: vi.fn(() => clientMocks)
}));

import { buildReportParams, getReport } from './get-reports';

let createCtx = (input: Record<string, unknown>) =>
  ({
    input,
    auth: { token: 'token', tenantId: 'tenant-id' },
    config: {}
  }) as any;

describe('Xero get_report', () => {
  it.each([
    'AgedReceivablesByContact',
    'AgedPayablesByContact'
  ] as const)('sends contactId for %s', async reportType => {
    clientMocks.getReport.mockResolvedValueOnce({
      ReportName: reportType,
      Rows: []
    });

    await getReport.handleInvocation(
      createCtx({ reportType, contactId: '5040915e-8ce7-4177-8d08-fde416232f18' })
    );

    expect(clientMocks.getReport).toHaveBeenCalledWith(reportType, {
      contactId: '5040915e-8ce7-4177-8d08-fde416232f18'
    });
  });

  it.each([
    'AgedReceivablesByContact',
    'AgedPayablesByContact'
  ] as const)('rejects %s without contactId before making an API request', reportType => {
    expect(() => buildReportParams({ reportType })).toThrow(ServiceError);
  });

  it('keeps the input schema compatible with the tool bridge', () => {
    let jsonSchema = z.toJSONSchema(getReport.inputSchema) as Record<string, any>;

    expect(jsonSchema.type).toBe('object');
    expect(jsonSchema.properties.contactId.type).toBe('string');
    expect(jsonSchema.required ?? []).not.toContain('contactId');
    expect(jsonSchema.oneOf).toBeUndefined();
    expect(jsonSchema.anyOf).toBeUndefined();
    expect(jsonSchema.allOf).toBeUndefined();
  });
});
