import { Slate } from 'slates';
import { spec } from './spec';
import {
  bulkGenerateAltText,
  deleteImage,
  generateAltText,
  getAccount,
  getImage,
  listImages,
  scrapePage,
  searchImages,
  updateImage
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    generateAltText,
    getAccount,
    getImage,
    listImages,
    searchImages,
    updateImage,
    deleteImage,
    scrapePage,
    bulkGenerateAltText
  ],
  triggers: []
});
