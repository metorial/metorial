import { Slate } from 'slates';
import { spec } from './spec';
import {
  contentWorkflow,
  executeGraphql,
  getContentHistory,
  getContentItem,
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
import { contentChanged } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
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
  triggers: [contentChanged]
});
