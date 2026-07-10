import { ServiceError } from '@lowerdeck/error';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  buildDataManagementExecutionRequest,
  buildDataManagementExportToPackageRequest,
  buildDataManagementGetAzureWriteUrlRequest,
  buildDataManagementImportFromPackageRequest,
  buildFinOpsDataUrl,
  buildFinOpsEntityPath,
  buildFinOpsODataParams,
  buildRecurringIntegrationAckRequest,
  buildRecurringIntegrationDequeueRequest,
  buildRecurringIntegrationEnqueueRequest,
  buildRecurringIntegrationMessageStatusRequest,
  createFinOpsAuthHeaders,
  DATA_MANAGEMENT_ACTION_PATHS,
  DynamicsFinOpsClient,
  dataManagementPackageOperationInputSchema,
  dynamicsFinOpsApiError,
  dynamicsFinOpsServiceError,
  type FinOpsHttpClient,
  type FinOpsHttpRequestConfig,
  type FinOpsHttpResponse,
  finOpsODataOperationInputSchema,
  normalizeDataManagementStatus,
  normalizeFinOpsBaseUrl,
  odataQueryInputSchema,
  parseDataManagementWritableBlob,
  parseFinOpsMetadata,
  recurringIntegrationOperationInputSchema,
  resolveFinOpsLegalEntity,
  validateDataManagementPackageOperationInput,
  validateFinOpsODataOperationInput,
  validateRecurringIntegrationOperationInput
} from './index';

let metadataXml = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
  <edmx:DataServices>
    <Schema Namespace="Microsoft.Dynamics.DataEntities" xmlns="http://docs.oasis-open.org/odata/ns/edm">
      <EntityType Name="CustomerV3">
        <Key>
          <PropertyRef Name="dataAreaId" />
          <PropertyRef Name="CustomerAccount" />
        </Key>
        <Property Name="dataAreaId" Type="Edm.String" Nullable="false" MaxLength="4" />
        <Property Name="CustomerAccount" Type="Edm.String" Nullable="false" />
        <Property Name="CreditLimit" Type="Edm.Decimal" />
        <NavigationProperty Name="DefaultDimension" Type="Microsoft.Dynamics.DataEntities.DimensionSet" />
      </EntityType>
      <EntityType Name="Warehouse">
        <Key>
          <PropertyRef Name="dataAreaId" />
          <PropertyRef Name="WarehouseId" />
        </Key>
        <Property Name="dataAreaId" Type="Edm.String" Nullable="false" />
        <Property Name="WarehouseId" Type="Edm.String" Nullable="false" />
      </EntityType>
      <EntityContainer Name="DataEntities">
        <EntitySet Name="CustomersV3" EntityType="Microsoft.Dynamics.DataEntities.CustomerV3" />
        <EntitySet Name="Warehouses" EntityType="Microsoft.Dynamics.DataEntities.Warehouse" />
      </EntityContainer>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`;

let metadata = parseFinOpsMetadata(metadataXml);

describe('dynamics finance and operations recipes', () => {
  it('uses MCP-compatible top-level object schemas for reusable operation inputs', () => {
    for (let schema of [
      odataQueryInputSchema,
      finOpsODataOperationInputSchema,
      dataManagementPackageOperationInputSchema,
      recurringIntegrationOperationInputSchema
    ]) {
      let jsonSchema = z.toJSONSchema(schema) as Record<string, unknown>;

      expect(jsonSchema.type).toBe('object');
      expect(jsonSchema).not.toHaveProperty('oneOf');
      expect(jsonSchema).not.toHaveProperty('anyOf');
      expect(jsonSchema).not.toHaveProperty('allOf');
    }
  });

  it('normalizes base URLs and auth headers', () => {
    expect(normalizeFinOpsBaseUrl('https://contoso.operations.dynamics.com/data?x=1')).toBe(
      'https://contoso.operations.dynamics.com'
    );
    expect(buildFinOpsDataUrl('https://contoso.operations.dynamics.com/')).toBe(
      'https://contoso.operations.dynamics.com/data'
    );
    expect(createFinOpsAuthHeaders({ token: ' token-1 ' })).toEqual({
      Authorization: 'Bearer token-1'
    });
    expect(() => normalizeFinOpsBaseUrl('not-a-url')).toThrow(ServiceError);
  });

  it('parses entity set, key, property, and navigation metadata', () => {
    expect(metadata.entitySets.CustomersV3.entityTypeName).toBe(
      'Microsoft.Dynamics.DataEntities.CustomerV3'
    );
    expect(metadata.entitySets.CustomersV3.entityType?.keys).toEqual([
      'dataAreaId',
      'CustomerAccount'
    ]);
    expect(metadata.entityTypes.CustomerV3.properties.dataAreaId).toMatchObject({
      type: 'Edm.String',
      nullable: false,
      maxLength: 4,
      isKey: true
    });
    expect(
      metadata.entityTypes.CustomerV3.navigationProperties.DefaultDimension
    ).toMatchObject({
      name: 'DefaultDimension'
    });
  });

  it('builds encoded entity keys from metadata and rejects missing key values', () => {
    expect(
      buildFinOpsEntityPath(metadata, 'CustomersV3', {
        dataAreaId: 'usmf',
        CustomerAccount: "CUST 001'O"
      })
    ).toBe("CustomersV3(dataAreaId='USMF',CustomerAccount='CUST%20001''O')");

    expect(() =>
      buildFinOpsEntityPath(metadata, 'CustomersV3', {
        dataAreaId: 'USMF'
      })
    ).toThrow(ServiceError);
  });

  it('builds safe OData params with legal entity and cross-company support', () => {
    expect(
      buildFinOpsODataParams({
        select: ['CustomerAccount', 'DefaultDimension/DisplayValue'],
        expand: ['DefaultDimension'],
        orderBy: [{ field: 'CustomerAccount', direction: 'asc' }, 'ModifiedDateTime desc'],
        top: 50,
        skip: 10,
        count: true,
        filter: 'Blocked eq false',
        legalEntity: 'usmf',
        crossCompany: true
      })
    ).toEqual({
      $select: 'CustomerAccount,DefaultDimension/DisplayValue',
      $expand: 'DefaultDimension',
      $orderby: 'CustomerAccount asc,ModifiedDateTime desc',
      $top: 50,
      $skip: 10,
      $count: 'true',
      'cross-company': 'true',
      $filter: "(Blocked eq false) and dataAreaId eq 'USMF'"
    });

    expect(() => buildFinOpsODataParams({ select: ['Name;$top=1'] })).toThrow(ServiceError);
    expect(() => buildFinOpsODataParams({ top: 10_001 })).toThrow(ServiceError);
  });

  it('defaults legal entity only for company-scoped requests', () => {
    expect(
      buildFinOpsODataParams(
        {
          filter: 'AccountNum ne null'
        },
        {
          defaultLegalEntity: 'usrt'
        }
      ).$filter
    ).toBe("(AccountNum ne null) and dataAreaId eq 'USRT'");

    expect(
      buildFinOpsODataParams(
        {
          crossCompany: true
        },
        {
          defaultLegalEntity: 'usrt'
        }
      )
    ).toEqual({
      'cross-company': 'true'
    });

    expect(
      resolveFinOpsLegalEntity({
        crossCompany: true,
        legalEntity: 'demf',
        defaultLegalEntity: 'usrt'
      })
    ).toBe('DEMF');
  });

  it('keeps OData pagination bounded and reports truncation', async () => {
    let calls: Array<{
      url: string;
      config?: unknown;
    }> = [];
    let api: FinOpsHttpClient = {
      get: async <T = unknown>(
        url: string,
        config?: FinOpsHttpRequestConfig
      ): Promise<FinOpsHttpResponse<T>> => {
        calls.push({ url, config });

        if (url === 'data/CustomersV3') {
          return {
            data: {
              value: [{ id: 1 }, { id: 2 }],
              '@odata.nextLink':
                'https://contoso.operations.dynamics.com/data/CustomersV3?$skiptoken=2'
            } as T
          };
        }

        return {
          data: {
            value: [{ id: 3 }],
            '@odata.nextLink':
              'https://contoso.operations.dynamics.com/data/CustomersV3?$skiptoken=3'
          } as T
        };
      },
      post: async <T = unknown>(): Promise<FinOpsHttpResponse<T>> => ({ data: {} as T }),
      patch: async <T = unknown>(): Promise<FinOpsHttpResponse<T>> => ({ data: {} as T }),
      delete: async <T = unknown>(): Promise<FinOpsHttpResponse<T>> => ({
        data: {} as T
      })
    };
    let client = new DynamicsFinOpsClient({
      baseUrl: 'https://contoso.operations.dynamics.com',
      token: 'token',
      api,
      defaultLegalEntity: 'usmf'
    });

    let result = await client.listDataEntityAll(
      'CustomersV3',
      {},
      { pageSize: 2, maxPages: 2 }
    );

    expect(result).toEqual({
      items: [{ id: 1 }, { id: 2 }, { id: 3 }],
      nextLink: 'https://contoso.operations.dynamics.com/data/CustomersV3?$skiptoken=3',
      pagesFetched: 2,
      truncated: true
    });
    expect(calls[0]).toMatchObject({
      url: 'data/CustomersV3',
      config: {
        params: {
          $top: 2,
          $filter: "dataAreaId eq 'USMF'"
        }
      }
    });
    await expect(
      client.listDataEntityAll('CustomersV3', {}, { maxPages: 101 })
    ).rejects.toThrow(ServiceError);
  });

  it('builds Data Management package payloads and normalizes execution status', () => {
    expect(
      buildDataManagementExportToPackageRequest({
        definitionGroupId: 'Customers export',
        packageName: 'customers.zip',
        executionId: 'exec-1',
        reExecute: true,
        legalEntityId: 'usmf'
      })
    ).toEqual({
      path: 'data/DataManagementDefinitionGroups/Microsoft.Dynamics.DataEntities.ExportToPackage',
      body: {
        definitionGroupId: 'Customers export',
        packageName: 'customers.zip',
        executionId: 'exec-1',
        reExecute: true,
        legalEntityId: 'USMF'
      }
    });

    expect(
      buildDataManagementImportFromPackageRequest({
        definitionGroupId: 'Customers import',
        packageUrl: 'https://storage.example/package.zip',
        executionId: 'exec-2',
        legalEntityId: 'demf'
      })
    ).toEqual({
      path: 'data/DataManagementDefinitionGroups/Microsoft.Dynamics.DataEntities.ImportFromPackage',
      body: {
        packageUrl: 'https://storage.example/package.zip',
        definitionGroupId: 'Customers import',
        executionId: 'exec-2',
        execute: false,
        overwrite: false,
        legalEntityId: 'DEMF'
      }
    });

    expect(
      buildDataManagementGetAzureWriteUrlRequest({ uniqueFileName: 'import-package.zip' })
    ).toEqual({
      path: 'data/DataManagementDefinitionGroups/Microsoft.Dynamics.DataEntities.GetAzureWriteUrl',
      body: {
        uniqueFileName: 'import-package.zip'
      }
    });

    expect(
      parseDataManagementWritableBlob({
        value: JSON.stringify({
          BlobId: '11111111-2222-3333-4444-555555555555',
          BlobUrl: 'https://storage.example/upload?sig=abc'
        })
      })
    ).toMatchObject({
      blobId: '11111111-2222-3333-4444-555555555555',
      blobUrl: 'https://storage.example/upload?sig=abc'
    });

    expect(
      buildDataManagementExecutionRequest(
        DATA_MANAGEMENT_ACTION_PATHS.getExecutionSummaryStatus,
        {
          executionId: 'exec-3'
        }
      )
    ).toEqual({
      path: 'data/DataManagementDefinitionGroups/Microsoft.Dynamics.DataEntities.GetExecutionSummaryStatus',
      body: {
        executionId: 'exec-3'
      }
    });

    expect(normalizeDataManagementStatus({ value: 'PartiallySucceeded' })).toMatchObject({
      rawStatus: 'PartiallySucceeded',
      status: 'partiallySucceeded',
      isTerminal: true,
      isSuccess: true
    });
  });

  it('builds recurring integration requests', () => {
    expect(
      buildRecurringIntegrationEnqueueRequest({
        activityId: '{activity-1}',
        entityName: 'Customers V3',
        body: 'payload',
        contentType: 'application/xml'
      })
    ).toEqual({
      path: 'api/connector/enqueue/%7Bactivity-1%7D?entity=Customers%20V3',
      body: 'payload',
      headers: {
        'Content-Type': 'application/xml'
      }
    });

    expect(buildRecurringIntegrationDequeueRequest({ activityId: 'activity-1' })).toEqual({
      path: 'api/connector/dequeue/activity-1'
    });
    expect(
      buildRecurringIntegrationAckRequest({
        activityId: 'activity-1',
        messageId: 'message-1',
        status: 'failure',
        errorMessage: 'Rejected'
      })
    ).toEqual({
      path: 'api/connector/ack/activity-1',
      body: {
        messageId: 'message-1',
        status: 'failure',
        errorMessage: 'Rejected'
      }
    });
    expect(buildRecurringIntegrationMessageStatusRequest({ messageId: 'message-1' })).toEqual({
      path: 'data/DataManagementDefinitionGroups/Microsoft.Dynamics.DataEntities.GetMessageStatus',
      body: {
        messageId: 'message-1'
      }
    });
  });

  it('validates enum-discriminated operation inputs at runtime', () => {
    expect(() =>
      validateFinOpsODataOperationInput({
        action: 'update',
        entitySetName: 'CustomersV3',
        record: {}
      })
    ).toThrow(ServiceError);
    expect(() =>
      validateDataManagementPackageOperationInput({
        action: 'import_from_package',
        definitionGroupId: 'group'
      })
    ).toThrow(ServiceError);
    expect(() =>
      validateRecurringIntegrationOperationInput({
        action: 'enqueue',
        activityId: 'activity-1'
      })
    ).toThrow(ServiceError);
  });

  it('normalizes upstream failures to ServiceError', () => {
    let error = dynamicsFinOpsApiError(
      {
        response: {
          status: 400,
          statusText: 'Bad Request',
          data: {
            error: {
              code: 'BadQuery',
              message: 'Invalid OData query.'
            }
          }
        }
      },
      'list customers'
    );

    expect(error).toBeInstanceOf(ServiceError);
    expect(error.data.reason).toBe('dynamics_finops_api_error');
    expect(error.data.upstreamStatus).toBe(400);
    expect(error.data.upstreamCode).toBe('BadQuery');
    expect(error.data.message).toContain('list customers failed');
    expect(error.data.message).toContain('Invalid OData query.');

    let existing = dynamicsFinOpsServiceError('Already normalized');
    expect(dynamicsFinOpsApiError(existing)).toBe(existing);
  });
});
