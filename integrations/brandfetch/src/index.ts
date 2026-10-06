import { Slate } from 'slates';
import { spec } from './spec';
import { enrichTransaction, getBrand, getLogoUrl, searchBrands } from './tools';
export let provider = Slate.create({
  spec,
  tools: [getBrand, searchBrands, enrichTransaction, getLogoUrl],
  triggers: []
});
