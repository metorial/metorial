import { Slate } from 'slates';
import { spec } from './spec';
import {
  createContentItem,
  deleteAsset,
  deleteContentItem,
  deleteLanguageVariant,
  getAsset,
  getContentItem,
  getContentType,
  getEnvironment,
  getLanguageVariant,
  listAssets,
  listCollections,
  listContentItems,
  listContentTypes,
  listLanguages,
  listTaxonomyGroups,
  listWorkflows,
  manageWorkflow,
  updateAsset,
  upsertLanguageVariant
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listContentItems,
    getContentItem,
    createContentItem,
    deleteContentItem,
    upsertLanguageVariant,
    getLanguageVariant,
    deleteLanguageVariant,
    getEnvironment,
    manageWorkflow,
    listContentTypes,
    getContentType,
    listAssets,
    getAsset,
    updateAsset,
    deleteAsset,
    listTaxonomyGroups,
    listWorkflows,
    listLanguages,
    listCollections
  ],
  triggers: []
});
