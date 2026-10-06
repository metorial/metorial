import { Slate } from 'slates';
import { spec } from './spec';
import {
  getBilling,
  getStatistics,
  manageCollection,
  manageDnsRecord,
  manageDnsZone,
  managePullZone,
  manageStorageFiles,
  manageStorageZone,
  manageVideo,
  manageVideoLibrary,
  purgeCache
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    managePullZone,
    purgeCache,
    manageStorageZone,
    manageStorageFiles,
    manageDnsZone,
    manageDnsRecord,
    manageVideoLibrary,
    manageVideo,
    manageCollection,
    getStatistics,
    getBilling
  ],
  triggers: []
});
