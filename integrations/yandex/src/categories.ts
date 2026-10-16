import { toolCategory } from 'slates';
import {
  controlInstance,
  createFunction,
  createInstance,
  deleteFunction,
  detectLanguage,
  getFunction,
  getInstance,
  getServiceAccount,
  invokeFunction,
  listBuckets,
  listClouds,
  listComputeImages,
  listContainerImages,
  listDisks,
  listDnsZones,
  listFolderBuckets,
  listFolders,
  listFunctions,
  listFunctionVersions,
  listInstances,
  listLanguages,
  listLogGroups,
  listNetworks,
  listObjects,
  listRecordSets,
  listRegistries,
  listServiceAccounts,
  listSubnets,
  manageApiKeys,
  manageBucket,
  manageDisk,
  manageDnsZone,
  manageFolder,
  manageNetwork,
  manageRegistry,
  manageServiceAccount,
  manageSubnet,
  readLogs,
  translateText,
  updateInstance,
  upsertDnsRecords,
  writeLogs
} from './tools';

export let toolCategories = [
  toolCategory({
    key: 'compute',
    name: 'Yandex Compute Cloud',
    description: 'Virtual machines, disks, and VM images.',
    tools: [
      listInstances,
      getInstance,
      createInstance,
      controlInstance,
      updateInstance,
      listDisks,
      manageDisk,
      listComputeImages
    ]
  }),
  toolCategory({
    key: 'storage',
    name: 'Yandex Object Storage',
    description: 'Buckets, bucket settings, and object listings.',
    tools: [listBuckets, manageBucket, listObjects, listFolderBuckets]
  }),
  toolCategory({
    key: 'functions',
    name: 'Yandex Cloud Functions',
    description: 'Serverless functions, deployed versions, and invocation.',
    tools: [
      listFunctions,
      getFunction,
      createFunction,
      deleteFunction,
      invokeFunction,
      listFunctionVersions
    ]
  }),
  toolCategory({
    key: 'translate',
    name: 'Yandex Translate',
    description: 'Text translation, language detection, and supported languages.',
    tools: [translateText, detectLanguage, listLanguages]
  }),
  toolCategory({
    key: 'iam',
    name: 'Yandex Identity and Access Management',
    description: 'Service accounts and API keys.',
    tools: [listServiceAccounts, getServiceAccount, manageServiceAccount, manageApiKeys]
  }),
  toolCategory({
    key: 'vpc',
    name: 'Yandex Virtual Private Cloud',
    description: 'Virtual networks and subnets.',
    tools: [listNetworks, listSubnets, manageNetwork, manageSubnet]
  }),
  toolCategory({
    key: 'dns',
    name: 'Yandex Cloud DNS',
    description: 'DNS zones and resource record sets.',
    tools: [listDnsZones, manageDnsZone, listRecordSets, upsertDnsRecords]
  }),
  toolCategory({
    key: 'resource_manager',
    name: 'Yandex Resource Manager',
    description: 'Cloud discovery and folder management.',
    tools: [listClouds, listFolders, manageFolder]
  }),
  toolCategory({
    key: 'container_registry',
    name: 'Yandex Container Registry',
    description: 'Container registries and Docker image listings.',
    tools: [listRegistries, manageRegistry, listContainerImages]
  }),
  toolCategory({
    key: 'logging',
    name: 'Yandex Cloud Logging',
    description: 'Log group discovery and log entry access.',
    tools: [listLogGroups, readLogs, writeLogs]
  })
];
