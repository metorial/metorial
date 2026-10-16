import { toolCategory } from 'slates';
import * as tools from './tools';

export let toolCategories = [
  toolCategory({
    key: 'fabric_core',
    name: 'Fabric Core',
    description: 'Fabric workspace and item discovery, item management, operations and jobs.',
    tools: [
      tools.coreCreateItem,
      tools.coreListWorkspaces,
      tools.coreListItems,
      tools.coreGetItem,
      tools.coreUpdateItem,
      tools.coreDeleteItem,
      tools.coreGetOperationState,
      tools.coreGetItemJob,
      tools.coreCancelItemJob
    ]
  }),
  toolCategory({
    key: 'data_factory',
    name: 'Data Factory',
    description: 'Fabric Data Pipelines, Dataflows and query execution.',
    tools: [
      tools.datafactoryListPipelines,
      tools.datafactoryCreatePipeline,
      tools.datafactoryGetPipeline,
      tools.datafactoryRunPipeline,
      tools.datafactoryListDataflows,
      tools.datafactoryCreateDataflow,
      tools.datafactoryExecuteQuery
    ]
  }),
  toolCategory({
    key: 'onelake',
    name: 'OneLake',
    description: 'OneLake file storage, directories and Iceberg table catalog metadata.',
    tools: [
      tools.onelakeListWorkspaces,
      tools.onelakeListItems,
      tools.onelakeListItemsDfs,
      tools.onelakeListFiles,
      tools.onelakeDownloadFile,
      tools.onelakeUploadFile,
      tools.onelakeDeleteFile,
      tools.onelakeCreateDirectory,
      tools.onelakeDeleteDirectory,
      tools.onelakeGetTableConfig,
      tools.onelakeListTableNamespaces,
      tools.onelakeGetTableNamespace,
      tools.onelakeListTables,
      tools.onelakeGetTable
    ]
  })
];
