import { Slate } from 'slates';
import { spec } from './spec';
import {
  listContainerImages,
  listRegistries,
  manageRegistry
} from './tools/manage-container-registry';
import { listDisks, manageDisk } from './tools/manage-disks';
import {
  listDnsZones,
  listRecordSets,
  manageDnsZone,
  upsertDnsRecords
} from './tools/manage-dns';
import {
  createFunction,
  deleteFunction,
  getFunction,
  invokeFunction,
  listFunctions
} from './tools/manage-functions';
import { listServiceAccounts, manageApiKeys, manageServiceAccount } from './tools/manage-iam';
import {
  controlInstance,
  createInstance,
  getInstance,
  listInstances,
  updateInstance
} from './tools/manage-instance';
import { readLogs, writeLogs } from './tools/manage-logging';
import { listClouds, listFolders, manageFolder } from './tools/manage-resources';
import { listBuckets, listObjects, manageBucket } from './tools/manage-storage';
import { listNetworks, listSubnets, manageNetwork, manageSubnet } from './tools/manage-vpc';
import { detectLanguage, listLanguages, translateText } from './tools/translate-text';
import { dnsZoneChanges } from './triggers/dns-zone-changes';
import { functionChanges } from './triggers/function-changes';
import { inboundWebhook } from './triggers/inbound-webhook';
import { instanceChanges } from './triggers/instance-changes';

export let provider = Slate.create({
  spec,
  tools: [
    listInstances,
    getInstance,
    createInstance,
    controlInstance,
    updateInstance,
    listDisks,
    manageDisk,
    listBuckets,
    manageBucket,
    listObjects,
    listFunctions,
    getFunction,
    createFunction,
    deleteFunction,
    invokeFunction,
    translateText,
    detectLanguage,
    listLanguages,
    listServiceAccounts,
    manageServiceAccount,
    manageApiKeys,
    listNetworks,
    listSubnets,
    manageNetwork,
    manageSubnet,
    listDnsZones,
    manageDnsZone,
    listRecordSets,
    upsertDnsRecords,
    listClouds,
    listFolders,
    manageFolder,
    listRegistries,
    manageRegistry,
    listContainerImages,
    readLogs,
    writeLogs
  ],
  triggers: [inboundWebhook, instanceChanges, functionChanges, dnsZoneChanges]
});
