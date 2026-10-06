import { Slate } from 'slates';
import { spec } from './spec';
import {
  createTag,
  deleteTag,
  getAssets,
  getDimensions,
  getModel,
  getNotes,
  getSweeps,
  listTags,
  purchaseAssetBundle,
  searchModels,
  updateModel,
  updateTag
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    searchModels,
    getModel,
    updateModel,
    listTags,
    createTag,
    updateTag,
    deleteTag,
    getAssets,
    purchaseAssetBundle,
    getSweeps,
    getDimensions,
    getNotes
  ],
  triggers: []
});
