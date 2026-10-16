import { Slate } from 'slates';
import { spec } from './spec';
import {
  createFlipbook,
  deleteFlipbook,
  getFlipbook,
  getOembed,
  listFlipbooks,
  manageAccessList,
  manageBookshelf,
  managePasswordProtection,
  updateFlipbookDesign,
  updateSocialMetadata
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    createFlipbook,
    listFlipbooks,
    getFlipbook,
    deleteFlipbook,
    updateSocialMetadata,
    managePasswordProtection,
    manageAccessList,
    manageBookshelf,
    getOembed,
    updateFlipbookDesign
  ],
  triggers: []
});
