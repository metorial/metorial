import { Slate } from 'slates';
import { spec } from './spec';
import {
  getContentTypes,
  getDrive,
  getFileVersions,
  getSite,
  listSites,
  manageColumns,
  manageFile,
  manageList,
  manageListItems,
  managePermissions,
  search,
  searchDrive
} from './tools';
import { driveItemChanges, inboundWebhook, listItemChanges } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    getSite,
    listSites,
    search,
    searchDrive,
    manageList,
    manageListItems,
    manageFile,
    getDrive,
    getFileVersions,
    managePermissions,
    manageColumns,
    getContentTypes
  ],
  triggers: [inboundWebhook, listItemChanges, driveItemChanges]
});
