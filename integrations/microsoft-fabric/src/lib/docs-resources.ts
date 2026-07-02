import { fabricValidationError } from './errors';

export type FabricDocsWorkload = {
  key: string;
  name: string;
  itemTypes: string[];
  docsUrl: string;
  apiSpecUrl?: string;
  examplesUrl?: string;
};

export type FabricDocsResource = {
  title: string;
  sourceUrls: string[];
  generatedAt: string;
  payload: unknown;
};

type FieldSpec = {
  type: string;
  required?: boolean;
  description: string;
  conflictsWith?: string[];
  enum?: string[];
};

type ApiExample = {
  name: string;
  method: string;
  path: string;
  body?: Record<string, unknown>;
  response?: Record<string, unknown>;
};

type ApiOperationSpec = {
  key: string;
  upstreamMcpName?: string;
  workloadKey?: string;
  area: 'core' | 'datafactory' | 'dataflow' | 'onelake' | 'docs';
  title: string;
  method: string;
  path: string;
  sourceUrl: string;
  scopes: string[];
  requestFields?: Record<string, FieldSpec>;
  queryParameters?: Record<string, FieldSpec>;
  response: {
    successStatus: number[];
    body?: string;
    lro?: boolean;
    headers?: string[];
  };
  examples: ApiExample[];
  notes?: string[];
};

let generatedAt = '2026-06-11';

let fabricRestBaseUrl = 'https://api.fabric.microsoft.com/v1';
let oneLakeApiBaseUrl = 'https://api.onelake.fabric.microsoft.com';
let oneLakeDfsBaseUrl = 'https://onelake.dfs.fabric.microsoft.com';
let oneLakeBlobBaseUrl = 'https://onelake.blob.fabric.microsoft.com';
let oneLakeTableBaseUrl = 'https://onelake.table.fabric.microsoft.com';

let genericItemScopes = [
  'https://api.fabric.microsoft.com/Workspace.ReadWrite.All',
  'https://api.fabric.microsoft.com/Item.ReadWrite.All'
];

let executeScopes = [
  'https://api.fabric.microsoft.com/Item.Execute.All',
  ...genericItemScopes
];

let storageScopes = ['https://storage.azure.com/.default'];

let lroResponse = {
  successStatus: [201, 202],
  body: 'Item body is returned for synchronous 201 responses. Accepted 202 responses return LRO headers.',
  lro: true,
  headers: ['Location', 'x-ms-operation-id', 'Retry-After']
};

let itemDefinitionField: FieldSpec = {
  type: 'ItemDefinition',
  description:
    'Public item definition with format and parts. Each part has path, payload, and payloadType.'
};

let folderIdField: FieldSpec = {
  type: 'string uuid',
  description:
    'Fabric folder ID. If omitted or null, the item is created in the workspace root.'
};

let sensitivityLabelField: FieldSpec = {
  type: 'SensitivityLabelSettings',
  description: 'Sensitivity label settings with labelId and sensitivityLabelApplyStrategy.'
};

let createItemRequestFields: Record<string, FieldSpec> = {
  displayName: {
    type: 'string',
    required: true,
    description: 'Item display name. Must follow the naming rules for the item type.'
  },
  type: {
    type: 'ItemType',
    required: true,
    description: 'Fabric item type, such as Lakehouse, DataPipeline, Dataflow, or Notebook.'
  },
  creationPayload: {
    type: 'object',
    description:
      'Item-type-specific creation properties. Use creationPayload or definition, not both.',
    conflictsWith: ['definition']
  },
  definition: {
    ...itemDefinitionField,
    description: 'Item-type-specific definition. Use definition or creationPayload, not both.',
    conflictsWith: ['creationPayload']
  },
  description: {
    type: 'string',
    description: 'Optional item description. Maximum length is 256 characters.'
  },
  folderId: folderIdField,
  sensitivityLabelSettings: sensitivityLabelField
};

let dataFactoryCreateFields: Record<string, FieldSpec> = {
  displayName: {
    type: 'string',
    required: true,
    description: 'Data Factory item display name.'
  },
  definition: itemDefinitionField,
  description: {
    type: 'string',
    description: 'Optional description. Maximum length is 256 characters.'
  },
  folderId: folderIdField,
  sensitivityLabelSettings: sensitivityLabelField
};

let folderListQueryParameters: Record<string, FieldSpec> = {
  continuationToken: {
    type: 'string',
    description: 'Continuation token from the prior response.'
  },
  recursive: {
    type: 'boolean',
    description: 'Lists items in nested folders when true. Fabric defaults this to true.'
  },
  rootFolderId: {
    type: 'string uuid',
    description:
      'Filters items to a specific root folder. If omitted, the workspace is used as the root folder.'
  }
};

export let workloads: FabricDocsWorkload[] = [
  {
    key: 'datapipeline',
    name: 'Data Pipeline',
    itemTypes: ['DataPipeline'],
    docsUrl: 'https://learn.microsoft.com/en-us/rest/api/fabric/datapipeline/items',
    apiSpecUrl:
      'https://learn.microsoft.com/en-us/rest/api/fabric/datapipeline/items/create-data-pipeline',
    examplesUrl:
      'https://learn.microsoft.com/en-us/rest/api/fabric/datapipeline/items/run-on-demand-item-job'
  },
  {
    key: 'dataflow',
    name: 'Dataflow',
    itemTypes: ['Dataflow'],
    docsUrl: 'https://learn.microsoft.com/en-us/rest/api/fabric/dataflow',
    apiSpecUrl:
      'https://learn.microsoft.com/en-us/rest/api/fabric/dataflow/query-execution/execute-query',
    examplesUrl:
      'https://learn.microsoft.com/en-us/rest/api/fabric/dataflow/items/create-dataflow'
  },
  {
    key: 'lakehouse',
    name: 'Lakehouse',
    itemTypes: ['Lakehouse'],
    docsUrl: 'https://learn.microsoft.com/en-us/rest/api/fabric/lakehouse',
    apiSpecUrl: 'https://learn.microsoft.com/en-us/rest/api/fabric/lakehouse/items',
    examplesUrl: 'https://learn.microsoft.com/en-us/fabric/onelake/onelake-access-api'
  },
  {
    key: 'warehouse',
    name: 'Warehouse',
    itemTypes: ['Warehouse'],
    docsUrl: 'https://learn.microsoft.com/en-us/rest/api/fabric/warehouse',
    apiSpecUrl: 'https://learn.microsoft.com/en-us/rest/api/fabric/warehouse/items'
  },
  {
    key: 'notebook',
    name: 'Notebook',
    itemTypes: ['Notebook'],
    docsUrl: 'https://learn.microsoft.com/en-us/rest/api/fabric/notebook',
    apiSpecUrl: 'https://learn.microsoft.com/en-us/rest/api/fabric/notebook/items'
  },
  {
    key: 'semanticmodel',
    name: 'Semantic Model',
    itemTypes: ['SemanticModel'],
    docsUrl: 'https://learn.microsoft.com/en-us/rest/api/fabric/semanticmodel',
    apiSpecUrl: 'https://learn.microsoft.com/en-us/rest/api/fabric/semanticmodel/items'
  },
  {
    key: 'report',
    name: 'Report',
    itemTypes: ['Report'],
    docsUrl: 'https://learn.microsoft.com/en-us/rest/api/fabric/report',
    apiSpecUrl: 'https://learn.microsoft.com/en-us/rest/api/fabric/report/items'
  },
  {
    key: 'sqldatabase',
    name: 'SQL Database',
    itemTypes: ['SQLDatabase'],
    docsUrl: 'https://learn.microsoft.com/en-us/rest/api/fabric/sqldatabase',
    apiSpecUrl: 'https://learn.microsoft.com/en-us/rest/api/fabric/sqldatabase/items'
  },
  {
    key: 'kqldatabase',
    name: 'KQL Database',
    itemTypes: ['KQLDatabase'],
    docsUrl: 'https://learn.microsoft.com/en-us/rest/api/fabric/kqldatabase',
    apiSpecUrl: 'https://learn.microsoft.com/en-us/rest/api/fabric/kqldatabase/items'
  },
  {
    key: 'variablelibrary',
    name: 'Variable Library',
    itemTypes: ['VariableLibrary'],
    docsUrl: 'https://learn.microsoft.com/en-us/rest/api/fabric/variablelibrary',
    apiSpecUrl: 'https://learn.microsoft.com/en-us/rest/api/fabric/variablelibrary/items'
  },
  {
    key: 'userdatafunctions',
    name: 'User Data Functions',
    itemTypes: ['UserDataFunction'],
    docsUrl: 'https://learn.microsoft.com/en-us/rest/api/fabric/userdatafunctions',
    apiSpecUrl: 'https://learn.microsoft.com/en-us/rest/api/fabric/userdatafunctions/items'
  }
];

let apiOperations: ApiOperationSpec[] = [
  {
    key: 'core_create_item',
    upstreamMcpName: 'core_create-item',
    area: 'core',
    title: 'Create Fabric item',
    method: 'POST',
    path: '/workspaces/{workspaceId}/items',
    sourceUrl: 'https://learn.microsoft.com/en-us/rest/api/fabric/core/items/create-item',
    scopes: genericItemScopes,
    requestFields: createItemRequestFields,
    response: lroResponse,
    examples: [
      {
        name: 'Create Lakehouse in workspace root',
        method: 'POST',
        path: '/workspaces/{workspaceId}/items',
        body: { displayName: 'Item 1', type: 'Lakehouse' },
        response: { status: 201, id: '5b218778-e7a5-4d73-8187-f10824047715' }
      },
      {
        name: 'Create item in folder',
        method: 'POST',
        path: '/workspaces/{workspaceId}/items',
        body: {
          displayName: 'Item 1',
          type: 'Lakehouse',
          folderId: 'bbbbbbbb-1111-2222-3333-cccccccccccc'
        }
      },
      {
        name: 'Create item with sensitivity label',
        method: 'POST',
        path: '/workspaces/{workspaceId}/items',
        body: {
          displayName: 'Item with label',
          type: 'Lakehouse',
          sensitivityLabelSettings: {
            labelId: 'b7b4f4d9-3f0d-4b3e-8f3d-4f6d3f4f3f4f',
            sensitivityLabelApplyStrategy: 'ApplyOrFail'
          }
        }
      }
    ],
    notes: ['Use either creationPayload or definition. Do not send both.']
  },
  {
    key: 'core_delete_item',
    area: 'core',
    title: 'Delete Fabric item',
    method: 'DELETE',
    path: '/workspaces/{workspaceId}/items/{itemId}',
    sourceUrl: 'https://learn.microsoft.com/en-us/rest/api/fabric/core/items/delete-item',
    scopes: genericItemScopes,
    queryParameters: {
      hardDelete: {
        type: 'boolean',
        description:
          'When true, permanently deletes the item. Otherwise the API soft-deletes supported item types.'
      }
    },
    response: { successStatus: [200] },
    examples: [
      {
        name: 'Soft delete item',
        method: 'DELETE',
        path: '/workspaces/{workspaceId}/items/{itemId}'
      },
      {
        name: 'Hard delete item',
        method: 'DELETE',
        path: '/workspaces/{workspaceId}/items/{itemId}?hardDelete=true'
      }
    ]
  },
  {
    key: 'datafactory_list_pipelines',
    upstreamMcpName: 'datafactory_list-pipelines',
    workloadKey: 'datapipeline',
    area: 'datafactory',
    title: 'List Data Pipelines',
    method: 'GET',
    path: '/workspaces/{workspaceId}/dataPipelines',
    sourceUrl:
      'https://learn.microsoft.com/en-us/rest/api/fabric/datapipeline/items/list-data-pipelines',
    scopes: genericItemScopes,
    queryParameters: folderListQueryParameters,
    response: {
      successStatus: [200],
      body: 'Paginated object with value array and continuationToken.'
    },
    examples: [
      {
        name: 'List Data Pipelines',
        method: 'GET',
        path: '/workspaces/{workspaceId}/dataPipelines'
      }
    ]
  },
  {
    key: 'datafactory_create_pipeline',
    upstreamMcpName: 'datafactory_create-pipeline',
    workloadKey: 'datapipeline',
    area: 'datafactory',
    title: 'Create Data Pipeline',
    method: 'POST',
    path: '/workspaces/{workspaceId}/dataPipelines',
    sourceUrl:
      'https://learn.microsoft.com/en-us/rest/api/fabric/datapipeline/items/create-data-pipeline',
    scopes: genericItemScopes,
    requestFields: dataFactoryCreateFields,
    response: lroResponse,
    examples: [
      {
        name: 'Create Data Pipeline',
        method: 'POST',
        path: '/workspaces/{workspaceId}/dataPipelines',
        body: {
          displayName: 'DataPipeline 1',
          description: 'A data pipeline description'
        }
      },
      {
        name: 'Create Data Pipeline with public definition',
        method: 'POST',
        path: '/workspaces/{workspaceId}/dataPipelines',
        body: {
          displayName: 'DataPipeline 1',
          definition: {
            parts: [
              {
                path: 'pipeline-content.json',
                payload: '<InlineBase64 payload>',
                payloadType: 'InlineBase64'
              },
              {
                path: '.platform',
                payload: '<InlineBase64 payload>',
                payloadType: 'InlineBase64'
              }
            ]
          }
        }
      }
    ]
  },
  {
    key: 'datafactory_get_pipeline',
    upstreamMcpName: 'datafactory_get-pipeline',
    workloadKey: 'datapipeline',
    area: 'datafactory',
    title: 'Get Data Pipeline',
    method: 'GET',
    path: '/workspaces/{workspaceId}/dataPipelines/{dataPipelineId}',
    sourceUrl:
      'https://learn.microsoft.com/en-us/rest/api/fabric/datapipeline/items/get-data-pipeline',
    scopes: genericItemScopes,
    response: { successStatus: [200], body: 'Data Pipeline item.' },
    examples: [
      {
        name: 'Get Data Pipeline',
        method: 'GET',
        path: '/workspaces/{workspaceId}/dataPipelines/{dataPipelineId}'
      }
    ]
  },
  {
    key: 'datafactory_run_pipeline',
    upstreamMcpName: 'datafactory_run-pipeline',
    workloadKey: 'datapipeline',
    area: 'datafactory',
    title: 'Run Data Pipeline on demand',
    method: 'POST',
    path: '/workspaces/{workspaceId}/items/{dataPipelineId}/jobs/{jobType}/instances',
    sourceUrl:
      'https://learn.microsoft.com/en-us/rest/api/fabric/core/job-scheduler/run-on-demand-item-job',
    scopes: executeScopes,
    requestFields: {
      executionData: {
        type: 'object',
        description:
          'Optional fixed execution data for the item job type. The supported shape is defined by Fabric for the specific item job type.'
      },
      parameters: {
        type: 'Parameter[]',
        description:
          'Optional per-run item job parameters. Each parameter has name, value, and type. Fabric does not support parameters for every item type or job type.'
      }
    },
    response: {
      successStatus: [202],
      lro: true,
      headers: ['Location', 'Retry-After']
    },
    examples: [
      {
        name: 'Run Data Pipeline',
        method: 'POST',
        path: '/workspaces/{workspaceId}/items/{dataPipelineId}/jobs/DefaultJob/instances'
      }
    ]
  },
  {
    key: 'datafactory_list_dataflows',
    upstreamMcpName: 'datafactory_list-dataflows',
    workloadKey: 'dataflow',
    area: 'dataflow',
    title: 'List Dataflows',
    method: 'GET',
    path: '/workspaces/{workspaceId}/dataflows',
    sourceUrl:
      'https://learn.microsoft.com/en-us/rest/api/fabric/dataflow/items/list-dataflows',
    scopes: genericItemScopes,
    queryParameters: folderListQueryParameters,
    response: {
      successStatus: [200],
      body: 'Paginated object with value array and continuationToken.'
    },
    examples: [
      {
        name: 'List Dataflows',
        method: 'GET',
        path: '/workspaces/{workspaceId}/dataflows'
      }
    ]
  },
  {
    key: 'datafactory_create_dataflow',
    upstreamMcpName: 'datafactory_create-dataflow',
    workloadKey: 'dataflow',
    area: 'dataflow',
    title: 'Create Dataflow',
    method: 'POST',
    path: '/workspaces/{workspaceId}/dataflows',
    sourceUrl:
      'https://learn.microsoft.com/en-us/rest/api/fabric/dataflow/items/create-dataflow',
    scopes: genericItemScopes,
    requestFields: dataFactoryCreateFields,
    response: lroResponse,
    examples: [
      {
        name: 'Create Dataflow',
        method: 'POST',
        path: '/workspaces/{workspaceId}/dataflows',
        body: { displayName: 'TestDataflow', description: 'A Dataflow description.' }
      },
      {
        name: 'Create Dataflow with public definition',
        method: 'POST',
        path: '/workspaces/{workspaceId}/dataflows',
        body: {
          displayName: 'TestDataflow',
          definition: {
            parts: [
              {
                path: 'queryMetadata.json',
                payload: '<InlineBase64 payload>',
                payloadType: 'InlineBase64'
              },
              {
                path: 'mashup.pq',
                payload: '<InlineBase64 payload>',
                payloadType: 'InlineBase64'
              },
              {
                path: '.platform',
                payload: '<InlineBase64 payload>',
                payloadType: 'InlineBase64'
              }
            ]
          }
        }
      }
    ]
  },
  {
    key: 'datafactory_execute_query',
    upstreamMcpName: 'datafactory_execute-query',
    workloadKey: 'dataflow',
    area: 'dataflow',
    title: 'Execute Dataflow query',
    method: 'POST',
    path: '/workspaces/{workspaceId}/dataflows/{dataflowId}/executeQuery',
    sourceUrl:
      'https://learn.microsoft.com/en-us/rest/api/fabric/dataflow/query-execution/execute-query',
    scopes: executeScopes,
    requestFields: {
      queryName: {
        type: 'string',
        required: true,
        description: 'Name of the Dataflow query to execute.'
      },
      customMashupDocument: {
        type: 'string',
        description: 'Optional custom Mashup document / M expression.'
      }
    },
    response: {
      successStatus: [200, 202],
      body: 'Arrow stream for synchronous query results, or LRO metadata for accepted requests.',
      lro: true,
      headers: ['Location', 'x-ms-operation-id', 'Retry-After']
    },
    examples: [
      {
        name: 'Execute query by name',
        method: 'POST',
        path: '/workspaces/{workspaceId}/dataflows/{dataflowId}/executeQuery',
        body: { queryName: 'Customers' }
      },
      {
        name: 'Execute custom Mashup query',
        method: 'POST',
        path: '/workspaces/{workspaceId}/dataflows/{dataflowId}/executeQuery',
        body: {
          queryName: 'Customers',
          customMashupDocument: 'section Section1; shared Customers = ...;'
        }
      }
    ]
  },
  {
    key: 'onelake_list_workspaces',
    upstreamMcpName: 'onelake_list_workspaces',
    area: 'onelake',
    title: 'List OneLake workspaces',
    method: 'GET',
    path: '/workspaces',
    sourceUrl: 'https://learn.microsoft.com/en-us/fabric/onelake/onelake-access-api',
    scopes: storageScopes,
    response: { successStatus: [200], body: 'Workspace collection.' },
    examples: [{ name: 'List workspaces', method: 'GET', path: '/workspaces' }]
  },
  {
    key: 'onelake_list_items',
    upstreamMcpName: 'onelake_list_items',
    area: 'onelake',
    title: 'List OneLake items',
    method: 'GET',
    path: '/workspaces/{workspace}/items',
    sourceUrl: 'https://learn.microsoft.com/en-us/fabric/onelake/onelake-access-api',
    scopes: storageScopes,
    response: { successStatus: [200], body: 'Item collection.' },
    examples: [
      {
        name: 'List workspace items',
        method: 'GET',
        path: '/workspaces/{workspace}/items'
      }
    ]
  },
  {
    key: 'onelake_list_files',
    upstreamMcpName: 'onelake_list_files',
    area: 'onelake',
    title: 'List OneLake files with DFS API',
    method: 'GET',
    path: '/{workspace}?resource=filesystem&directory={item}/{path}',
    sourceUrl: 'https://learn.microsoft.com/en-us/fabric/onelake/onelake-access-api',
    scopes: storageScopes,
    queryParameters: {
      resource: { type: 'string', required: true, description: 'Use filesystem.' },
      directory: {
        type: 'string',
        description: 'Item and optional relative directory path.'
      },
      recursive: { type: 'boolean', description: 'Whether to recursively list paths.' }
    },
    response: { successStatus: [200], body: 'DFS path listing.' },
    examples: [
      {
        name: 'List Files directory',
        method: 'GET',
        path: '/{workspace}?resource=filesystem&directory={lakehouse}.Lakehouse/Files'
      }
    ]
  },
  {
    key: 'onelake_download_file',
    upstreamMcpName: 'onelake_download_file',
    area: 'onelake',
    title: 'Download OneLake file',
    method: 'GET',
    path: '/{workspace}/{item}/{filePath}',
    sourceUrl: 'https://learn.microsoft.com/en-us/fabric/onelake/onelake-access-api',
    scopes: storageScopes,
    response: { successStatus: [200], body: 'Binary file body.' },
    examples: [
      {
        name: 'Download file',
        method: 'GET',
        path: '/{workspace}/{lakehouse}.Lakehouse/Files/fabric-demo/demo.csv'
      }
    ]
  },
  {
    key: 'onelake_upload_file',
    upstreamMcpName: 'onelake_upload_file',
    area: 'onelake',
    title: 'Upload OneLake file',
    method: 'PUT',
    path: '/{workspace}/{item}/{filePath}',
    sourceUrl: 'https://learn.microsoft.com/en-us/fabric/onelake/onelake-access-api',
    scopes: storageScopes,
    requestFields: {
      content: { type: 'binary', required: true, description: 'File content.' },
      xMsBlobType: { type: 'header', required: true, description: 'Use BlockBlob.' }
    },
    response: { successStatus: [201, 202], headers: ['etag', 'last-modified'] },
    examples: [
      {
        name: 'Upload text file',
        method: 'PUT',
        path: '/{workspace}/{lakehouse}.Lakehouse/Files/fabric-demo/demo.txt',
        body: { contentText: 'hello', contentType: 'text/plain' }
      }
    ]
  },
  {
    key: 'onelake_delete_file',
    upstreamMcpName: 'onelake_delete_file',
    area: 'onelake',
    title: 'Delete OneLake file',
    method: 'DELETE',
    path: '/{workspace}/{item}/{filePath}',
    sourceUrl: 'https://learn.microsoft.com/en-us/fabric/onelake/onelake-access-api',
    scopes: storageScopes,
    response: { successStatus: [200, 202, 204] },
    examples: [
      {
        name: 'Delete file',
        method: 'DELETE',
        path: '/{workspace}/{lakehouse}.Lakehouse/Files/fabric-demo/demo.txt'
      }
    ]
  },
  {
    key: 'onelake_create_directory',
    upstreamMcpName: 'onelake_create_directory',
    area: 'onelake',
    title: 'Create OneLake directory',
    method: 'PUT',
    path: '/{workspace}/{item}/{directoryPath}?resource=directory',
    sourceUrl: 'https://learn.microsoft.com/en-us/fabric/onelake/onelake-access-api',
    scopes: storageScopes,
    response: { successStatus: [201, 202], headers: ['etag', 'last-modified'] },
    examples: [
      {
        name: 'Create directory',
        method: 'PUT',
        path: '/{workspace}/{lakehouse}.Lakehouse/Files/fabric-demo?resource=directory'
      }
    ]
  },
  {
    key: 'onelake_delete_directory',
    upstreamMcpName: 'onelake_delete_directory',
    area: 'onelake',
    title: 'Delete OneLake directory',
    method: 'DELETE',
    path: '/{workspace}/{item}/{directoryPath}?recursive=true',
    sourceUrl: 'https://learn.microsoft.com/en-us/fabric/onelake/onelake-access-api',
    scopes: storageScopes,
    response: { successStatus: [200, 202, 204] },
    examples: [
      {
        name: 'Delete directory recursively',
        method: 'DELETE',
        path: '/{workspace}/{lakehouse}.Lakehouse/Files/fabric-demo?recursive=true'
      }
    ]
  },
  {
    key: 'onelake_tables',
    area: 'onelake',
    title: 'OneLake Iceberg REST catalog operations',
    method: 'GET',
    path: '/iceberg/v1/{workspace}/{item}/namespaces/{namespace}/tables',
    sourceUrl: 'https://learn.microsoft.com/en-us/fabric/onelake/onelake-access-api',
    scopes: storageScopes,
    response: {
      successStatus: [200],
      body: 'Iceberg REST catalog config, namespace, table list, or table metadata.'
    },
    examples: [
      {
        name: 'List Iceberg namespaces',
        method: 'GET',
        path: '/iceberg/v1/{workspace}/{lakehouse}.Lakehouse/namespaces'
      },
      {
        name: 'Get Iceberg table metadata',
        method: 'GET',
        path: '/iceberg/v1/{workspace}/{lakehouse}.Lakehouse/namespaces/default/tables/Sales'
      }
    ]
  }
];

let uniqueStrings = (values: (string | undefined)[]) =>
  Array.from(new Set(values.filter((value): value is string => Boolean(value))));

let normalizeKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

let matchesTerm = (values: (string | undefined)[], term?: string) => {
  if (!term?.trim()) return true;
  let normalizedTerm = normalizeKey(term);
  return values.some(
    value => value !== undefined && normalizeKey(value).includes(normalizedTerm)
  );
};

let operationMatchesWorkload = (operation: ApiOperationSpec, workload: FabricDocsWorkload) =>
  operation.workloadKey === workload.key ||
  (workload.key === 'lakehouse' && operation.area === 'onelake') ||
  (operation.area === 'core' &&
    workload.itemTypes.some(itemType =>
      ['Lakehouse', 'DataPipeline', 'Dataflow'].includes(itemType)
    ));

let operationMatchesArea = (operation: ApiOperationSpec, area?: string) =>
  matchesTerm([operation.area, operation.key, operation.title], area);

let compactOperation = (operation: ApiOperationSpec) => ({
  key: operation.key,
  upstreamMcpName: operation.upstreamMcpName,
  area: operation.area,
  workloadKey: operation.workloadKey,
  title: operation.title,
  method: operation.method,
  path: operation.path,
  sourceUrl: operation.sourceUrl,
  scopes: operation.scopes,
  requestFields: operation.requestFields,
  queryParameters: operation.queryParameters,
  response: operation.response,
  examples: operation.examples,
  notes: operation.notes
});

let examplesFor = (operation: ApiOperationSpec, operationFilter?: string) =>
  operation.examples.filter(example =>
    matchesTerm([operation.key, operation.title, example.name, example.path], operationFilter)
  );

export let resolveWorkload = (workloadType: string) => {
  let normalized = normalizeKey(workloadType);
  let workload = workloads.find(
    entry =>
      entry.key === normalized ||
      normalizeKey(entry.name) === normalized ||
      entry.itemTypes.some(itemType => normalizeKey(itemType) === normalized)
  );

  if (!workload) {
    throw fabricValidationError(
      `Unknown Fabric workload "${workloadType}". Use docs_workloads to list supported workload keys.`
    );
  }

  return workload;
};

export let createDocsResource = (input: {
  title: string;
  sourceUrls: string[];
  payload: unknown;
}): FabricDocsResource => ({
  title: input.title,
  sourceUrls: uniqueStrings(input.sourceUrls),
  generatedAt,
  payload: input.payload
});

export let workloadApiResource = (workloadType: string) => {
  let workload = resolveWorkload(workloadType);
  let operations = apiOperations.filter(operation =>
    operationMatchesWorkload(operation, workload)
  );

  return createDocsResource({
    title: `Microsoft Fabric ${workload.name} API spec`,
    sourceUrls: uniqueStrings([
      workload.apiSpecUrl,
      workload.docsUrl,
      ...operations.map(operation => operation.sourceUrl)
    ]),
    payload: {
      workload,
      baseUrls: {
        fabricRest: fabricRestBaseUrl,
        oneLakeApi: oneLakeApiBaseUrl,
        oneLakeDfs: oneLakeDfsBaseUrl,
        oneLakeBlob: oneLakeBlobBaseUrl,
        oneLakeTable: oneLakeTableBaseUrl
      },
      operations: operations.map(compactOperation)
    }
  });
};

export let platformApiResource = (area?: string) => {
  let operations = apiOperations.filter(operation => operationMatchesArea(operation, area));

  return createDocsResource({
    title: area ? `Microsoft Fabric platform API: ${area}` : 'Microsoft Fabric platform APIs',
    sourceUrls: uniqueStrings([
      'https://learn.microsoft.com/en-us/rest/api/fabric/articles/',
      'https://learn.microsoft.com/en-us/rest/api/fabric/articles/scopes',
      ...operations.map(operation => operation.sourceUrl)
    ]),
    payload: {
      baseUrls: {
        fabricRest: fabricRestBaseUrl,
        oneLakeApi: oneLakeApiBaseUrl,
        oneLakeDfs: oneLakeDfsBaseUrl,
        oneLakeBlob: oneLakeBlobBaseUrl,
        oneLakeTable: oneLakeTableBaseUrl
      },
      pagination: {
        queryParameter: 'continuationToken',
        responseField: 'continuationToken'
      },
      longRunningOperations: {
        headers: ['Location', 'x-ms-operation-id', 'Retry-After'],
        statusCodes: [202]
      },
      tokenAudiences: {
        fabricRest: 'https://api.fabric.microsoft.com',
        oneLakeDataPlane: 'https://storage.azure.com'
      },
      scopes: uniqueStrings(apiOperations.flatMap(operation => operation.scopes)),
      highlightedArea: area,
      operations: operations.map(compactOperation)
    }
  });
};

export let itemDefinitionsResource = (itemType?: string) => {
  let selectedType = itemType?.trim();

  return createDocsResource({
    title: selectedType
      ? `Microsoft Fabric item definitions: ${selectedType}`
      : 'Microsoft Fabric item definitions',
    sourceUrls: [
      'https://learn.microsoft.com/en-us/rest/api/fabric/core/items/create-item',
      'https://learn.microsoft.com/en-us/rest/api/fabric/articles/item-management/definitions',
      'https://learn.microsoft.com/en-us/rest/api/fabric/datapipeline/items/create-data-pipeline',
      'https://learn.microsoft.com/en-us/rest/api/fabric/dataflow/items/create-dataflow'
    ],
    payload: {
      itemType: selectedType,
      createItemRequest: {
        fields: createItemRequestFields,
        rule: 'Use exactly one of creationPayload or definition when either is required by the item type.'
      },
      itemDefinition: {
        type: 'object',
        fields: {
          format: {
            type: 'string',
            description: 'Optional definition format, when required by the item type.'
          },
          parts: {
            type: 'ItemDefinitionPart[]',
            required: true,
            description: 'Definition parts for the item.'
          }
        }
      },
      itemDefinitionPart: {
        path: {
          type: 'string',
          required: true,
          description: 'Part path, such as pipeline-content.json, mashup.pq, or .platform.'
        },
        payload: {
          type: 'string',
          required: true,
          description: 'Part content encoded according to payloadType.'
        },
        payloadType: {
          type: 'PayloadType',
          required: true,
          enum: ['InlineBase64'],
          description: 'Payload encoding.'
        }
      },
      dataPipelineCreateRequest: dataFactoryCreateFields,
      dataflowCreateRequest: dataFactoryCreateFields,
      commonItemTypes: workloads.flatMap(workload => workload.itemTypes)
    }
  });
};

export let bestPracticesResource = (topic?: string) =>
  createDocsResource({
    title: topic
      ? `Microsoft Fabric best practices: ${topic}`
      : 'Microsoft Fabric best practices',
    sourceUrls: [
      'https://learn.microsoft.com/en-us/fabric/fundamentals/',
      'https://learn.microsoft.com/en-us/fabric/onelake/onelake-access-api',
      'https://learn.microsoft.com/en-us/rest/api/fabric/articles/long-running-operation',
      'https://learn.microsoft.com/en-us/rest/api/fabric/core/items/create-item'
    ],
    payload: {
      topic,
      practices: [
        'Use Fabric-audience tokens for Fabric REST and Storage-audience tokens for OneLake data-plane APIs.',
        'Treat 202 responses with Location, x-ms-operation-id, and Retry-After as long-running operations.',
        'Use continuationToken pagination for Fabric list APIs.',
        'Use either creationPayload or definition in create item calls, never both.',
        'Pass folderId when the target folder is known instead of creating all items at workspace root.',
        'Pass friendly OneLake item identifiers with the item type suffix where the upstream API supports them, for example MyLakehouse.Lakehouse.',
        'Do not inline large file or Arrow stream bodies in tool output; return them as attachments.'
      ],
      relevantOperations: apiOperations
        .filter(operation => operationMatchesArea(operation, topic))
        .map(compactOperation)
    }
  });

export let examplesResource = (workloadType?: string, operation?: string) => {
  let selectedWorkloads = workloadType ? [resolveWorkload(workloadType)] : workloads;
  let selectedOperations = apiOperations.filter(apiOperation =>
    selectedWorkloads.some(workload => operationMatchesWorkload(apiOperation, workload))
  );

  let examples = selectedOperations.flatMap(apiOperation =>
    examplesFor(apiOperation, operation).map(example => ({
      workload: apiOperation.workloadKey,
      operationKey: apiOperation.key,
      sourceUrl: apiOperation.sourceUrl,
      ...example
    }))
  );

  return createDocsResource({
    title: workloadType
      ? `Microsoft Fabric API examples: ${selectedWorkloads[0]?.name}`
      : 'Microsoft Fabric API examples',
    sourceUrls: uniqueStrings([
      ...selectedWorkloads.flatMap(workload => [
        workload.examplesUrl,
        workload.apiSpecUrl,
        workload.docsUrl
      ]),
      ...selectedOperations.map(apiOperation => apiOperation.sourceUrl)
    ]),
    payload: {
      operation,
      examples,
      operationCount: selectedOperations.length,
      exampleCount: examples.length
    }
  });
};
