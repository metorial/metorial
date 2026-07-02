import { describe, expect, it } from 'vitest';
import { resolveFabricRuntimeConfig } from '../config';
import { extractOperationMetadata, FabricClient, responseDataToBuffer } from './client';
import {
  examplesResource,
  itemDefinitionsResource,
  platformApiResource,
  resolveWorkload,
  workloadApiResource
} from './docs-resources';
import { validateOneLakePath } from './paths';

describe('Microsoft Fabric helper contracts', () => {
  it('extracts Fabric long-running operation metadata from headers', () => {
    expect(
      extractOperationMetadata({
        status: 202,
        statusText: 'Accepted',
        data: {},
        headers: {
          Location: 'https://api.fabric.microsoft.com/v1/operations/abc',
          'x-ms-operation-id': 'abc',
          'Retry-After': '30'
        }
      })
    ).toEqual({
      status: 202,
      statusText: 'Accepted',
      location: 'https://api.fabric.microsoft.com/v1/operations/abc',
      operationId: 'abc',
      retryAfter: '30'
    });
  });

  it('rejects OneLake path traversal and absolute paths', () => {
    expect(() => validateOneLakePath('../secret', 'filePath')).toThrow();
    expect(() => validateOneLakePath('/Files/demo.csv', 'filePath')).toThrow();
    expect(() => validateOneLakePath('file:///tmp/demo.csv', 'filePath')).toThrow();
    expect(validateOneLakePath('Files/demo.csv', 'filePath')).toBe('Files/demo.csv');
  });

  it('normalizes binary response data to a Buffer', () => {
    let buffer = responseDataToBuffer(new Uint8Array([65, 66, 67]));
    expect(buffer.toString('utf8')).toBe('ABC');
  });

  it('resolves documentation workloads by item type', () => {
    expect(resolveWorkload('DataPipeline').key).toBe('datapipeline');
    expect(resolveWorkload('Lakehouse').key).toBe('lakehouse');
  });

  it('rejects create-item payloads that mix definition and creationPayload', async () => {
    let client = new FabricClient({
      token: 'test-token',
      config: resolveFabricRuntimeConfig()
    });

    await expect(
      client.createItem({
        workspaceId: '11111111-1111-1111-1111-111111111111',
        displayName: 'Invalid item',
        itemType: 'Lakehouse',
        definition: { parts: [] },
        creationPayload: {}
      })
    ).rejects.toThrow('Use either definition or creationPayload, not both.');
  });

  it('returns concrete API specs, item definitions, and examples in docs resources', () => {
    let platformPayload = platformApiResource('core').payload as {
      operations: Array<{ key: string; requestFields?: Record<string, unknown> }>;
    };
    let createItemSpec = platformPayload.operations.find(
      operation => operation.key === 'core_create_item'
    );
    expect(createItemSpec?.requestFields).toHaveProperty('creationPayload');
    expect(createItemSpec?.requestFields).toHaveProperty('folderId');
    expect(createItemSpec?.requestFields).toHaveProperty('sensitivityLabelSettings');

    let workloadPayload = workloadApiResource('DataPipeline').payload as {
      operations: Array<{
        key: string;
        path?: string;
        queryParameters?: Record<string, unknown>;
        requestFields?: Record<string, unknown>;
      }>;
    };
    expect(
      workloadPayload.operations.some(
        operation => operation.key === 'datafactory_create_pipeline'
      )
    ).toBe(true);
    let listPipelinesSpec = workloadPayload.operations.find(
      operation => operation.key === 'datafactory_list_pipelines'
    );
    expect(listPipelinesSpec?.queryParameters).toHaveProperty('recursive');
    expect(listPipelinesSpec?.queryParameters).toHaveProperty('rootFolderId');
    let runPipelineSpec = workloadPayload.operations.find(
      operation => operation.key === 'datafactory_run_pipeline'
    );
    expect(runPipelineSpec?.path).toBe(
      '/workspaces/{workspaceId}/items/{dataPipelineId}/jobs/{jobType}/instances'
    );
    expect(runPipelineSpec?.requestFields).toHaveProperty('executionData');
    expect(runPipelineSpec?.requestFields).toHaveProperty('parameters');

    let definitionsPayload = itemDefinitionsResource('Lakehouse').payload as {
      createItemRequest: { fields: Record<string, unknown> };
    };
    expect(definitionsPayload.createItemRequest.fields).toHaveProperty('definition');

    let examplesPayload = examplesResource('Dataflow', 'execute').payload as {
      examples: Array<{ operationKey: string }>;
    };
    expect(
      examplesPayload.examples.some(
        example => example.operationKey === 'datafactory_execute_query'
      )
    ).toBe(true);
  });
});
