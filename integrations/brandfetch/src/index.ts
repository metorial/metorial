import { Slate } from 'slates';
import { toolCategories } from './categories';
import { spec } from './spec';
import {
  enrichTransaction,
  getBrand,
  getBrandContext,
  getLogoUrl,
  searchBrands,
  whoAmI
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [getBrand, searchBrands, enrichTransaction, getLogoUrl, getBrandContext, whoAmI],
  toolCategories,
  triggers: []
});
