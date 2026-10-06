import { Slate } from 'slates';
import { spec } from './spec';
import {
  getContentTypes,
  getDrive,
  getFileVersions,
  getSite,
  getSiteUser,
  listSites,
  manageColumns,
  manageFile,
  manageList,
  manageListItems,
  managePermissions,
  search,
  searchDrive
} from './tools';
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
    getSiteUser,
    managePermissions,
    manageColumns,
    getContentTypes
  ],
  triggers: []
});
