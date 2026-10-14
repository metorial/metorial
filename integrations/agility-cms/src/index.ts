import { Slate } from 'slates';
import { spec } from './spec';
import {
  contentWorkflow,
  executeGraphql,
  getBatchStatus,
  getContentHistory,
  getContentItem,
  getCurrentUser,
  getLocales,
  getPage,
  getSitemap,
  listAssets,
  listContainers,
  listContent,
  listContentModels,
  listUsers,
  manageAsset,
  manageContentItem,
  manageContentModel,
  manageFolder,
  managePage,
  syncContent
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getCurrentUser,
    getBatchStatus,
    getContentItem,
    listContent,
    getPage,
    getSitemap,
    executeGraphql,
    syncContent,
    manageContentItem,
    contentWorkflow,
    managePage,
    listAssets,
    manageAsset,
    manageFolder,
    listContentModels,
    manageContentModel,
    getContentHistory,
    listContainers,
    listUsers,
    getLocales
  ],
  triggers: []
});
