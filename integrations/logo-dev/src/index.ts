import { Slate } from 'slates';
import { toolCategories } from './categories';
import { spec } from './spec';
import {
  describeBrand,
  downloadBrandImage,
  getFileUrl,
  getLogoUrl,
  lookupBrand,
  searchBrands
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    getLogoUrl,
    searchBrands,
    describeBrand,
    lookupBrand,
    downloadBrandImage,
    getFileUrl
  ],
  toolCategories,
  triggers: []
});
