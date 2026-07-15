import { ServiceError } from '@lowerdeck/error';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

let clientMocks = vi.hoisted(() => ({
  configs: [] as Array<{ token: string; projectId: string; location: string }>,
  createQueryJob: vi.fn(),
  waitForJob: vi.fn(),
  getQueryResults: vi.fn()
}));

vi.mock('./lib/client', () => ({
  BigQueryClient: class {
    constructor(config: { token: string; projectId: string; location: string }) {
      clientMocks.configs.push(config);
    }

    createQueryJob(...args: unknown[]) {
      return clientMocks.createQueryJob(...args);
    }

    waitForJob(...args: unknown[]) {
      return clientMocks.waitForJob(...args);
    }

    getQueryResults(...args: unknown[]) {
      return clientMocks.getQueryResults(...args);
    }
  }
}));

import { executeSqlReadonly } from './tools/execute-sql-readonly';

let createCtx = <T extends Record<string, any>>(input: T) =>
  ({
    input,
    auth: { token: 'test-token' },
    config: { projectId: 'test-project', location: 'EU' },
    progress: vi.fn()
  }) as any;

beforeEach(() => {
  clientMocks.configs.splice(0);
  clientMocks.createQueryJob.mockReset();
  clientMocks.waitForJob.mockReset();
  clientMocks.getQueryResults.mockReset();
});

describe('execute_sql_readonly', () => {
  it('exposes only the read-only query inputs', () => {
    let schema = z.toJSONSchema(executeSqlReadonly.inputSchema) as {
      type?: string;
      properties?: Record<string, unknown>;
      required?: string[];
    };

    expect(schema.type).toBe('object');
    expect(Object.keys(schema.properties ?? {})).toEqual([
      'query',
      'defaultDatasetId',
      'maximumBytesBilled',
      'maxResults',
      'parameterMode',
      'queryParameters',
      'labels'
    ]);
    expect(schema.required).toEqual(['query']);
  });

  it('accepts unnamed query parameters for POSITIONAL mode', () => {
    expect(
      executeSqlReadonly.inputSchema.parse({
        query: 'SELECT ? AS answer',
        parameterMode: 'POSITIONAL',
        queryParameters: [
          {
            parameterType: { type: 'INT64' },
            parameterValue: { value: '42' }
          }
        ]
      })
    ).toMatchObject({
      parameterMode: 'POSITIONAL',
      queryParameters: [
        {
          parameterType: { type: 'INT64' },
          parameterValue: { value: '42' }
        }
      ]
    });
  });

  it('dry-runs and executes the same SELECT query configuration', async () => {
    clientMocks.createQueryJob
      .mockResolvedValueOnce({
        statistics: {
          query: { statementType: 'SELECT', totalBytesProcessed: '64' }
        }
      })
      .mockResolvedValueOnce({
        jobReference: { jobId: 'job-123' }
      });
    clientMocks.waitForJob.mockResolvedValueOnce({
      status: { state: 'DONE' },
      statistics: {
        query: {
          statementType: 'SELECT',
          totalBytesProcessed: '64',
          cacheHit: true
        }
      }
    });
    clientMocks.getQueryResults.mockResolvedValueOnce({
      jobComplete: true,
      totalRows: '1',
      schema: { fields: [{ name: 'answer', type: 'INTEGER' }] },
      rows: [{ f: [{ v: '42' }] }]
    });

    let input = {
      query: 'SELECT @answer AS answer',
      defaultDatasetId: 'analytics',
      maximumBytesBilled: '1000',
      maxResults: 25,
      parameterMode: 'NAMED' as const,
      queryParameters: [
        {
          name: 'answer',
          parameterType: { type: 'INT64' },
          parameterValue: { value: '42' }
        }
      ],
      labels: { purpose: 'readonly_test' }
    };

    let result = await executeSqlReadonly.handleInvocation(createCtx(input));

    let queryJob = {
      query: input.query,
      defaultDataset: { datasetId: input.defaultDatasetId },
      maximumBytesBilled: input.maximumBytesBilled,
      labels: input.labels,
      queryParameters: input.queryParameters,
      parameterMode: input.parameterMode
    };
    expect(clientMocks.configs).toEqual([
      { token: 'test-token', projectId: 'test-project', location: 'EU' }
    ]);
    expect(clientMocks.createQueryJob).toHaveBeenNthCalledWith(1, {
      ...queryJob,
      dryRun: true
    });
    expect(clientMocks.createQueryJob).toHaveBeenNthCalledWith(2, queryJob);
    expect(clientMocks.waitForJob).toHaveBeenCalledWith('job-123', 120000);
    expect(clientMocks.getQueryResults).toHaveBeenCalledWith('job-123', {
      maxResults: 25
    });
    expect(result.output).toMatchObject({
      jobId: 'job-123',
      jobComplete: true,
      totalRows: '1',
      totalBytesProcessed: '64',
      cacheHit: true,
      statementType: 'SELECT'
    });
  });

  it.each([
    'INSERT',
    'SCRIPT',
    'CALL',
    'CREATE_TABLE',
    undefined
  ])('rejects dry-run statement type %s before submitting a real job', async statementType => {
    clientMocks.createQueryJob.mockResolvedValueOnce({
      statistics: { query: { statementType } }
    });

    let invocation = executeSqlReadonly.handleInvocation(createCtx({ query: 'SELECT 1' }));

    await expect(invocation).rejects.toBeInstanceOf(ServiceError);
    await expect(invocation).rejects.toMatchObject({
      data: {
        reason: 'bigquery_readonly_statement_type_rejected',
        phase: 'dry_run',
        statementType
      }
    });
    expect(clientMocks.createQueryJob).toHaveBeenCalledTimes(1);
    expect(clientMocks.waitForJob).not.toHaveBeenCalled();
    expect(clientMocks.getQueryResults).not.toHaveBeenCalled();
  });

  it('rejects when the completed job is no longer classified as SELECT', async () => {
    clientMocks.createQueryJob
      .mockResolvedValueOnce({
        statistics: { query: { statementType: 'SELECT' } }
      })
      .mockResolvedValueOnce({
        jobReference: { jobId: 'job-diverged' }
      });
    clientMocks.waitForJob.mockResolvedValueOnce({
      status: { state: 'DONE' },
      statistics: { query: { statementType: 'UPDATE' } }
    });

    let invocation = executeSqlReadonly.handleInvocation(createCtx({ query: 'SELECT 1' }));

    await expect(invocation).rejects.toMatchObject({
      data: {
        reason: 'bigquery_readonly_statement_type_rejected',
        phase: 'completed_job',
        statementType: 'UPDATE'
      }
    });
    expect(clientMocks.createQueryJob).toHaveBeenCalledTimes(2);
    expect(clientMocks.getQueryResults).not.toHaveBeenCalled();
  });
});
