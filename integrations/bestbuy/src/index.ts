import { Slate } from 'slates';
import { spec } from './spec';
import {
  browseCategories,
  checkAvailability,
  getOpenBoxOffers,
  getProduct,
  getRecommendations,
  searchProducts,
  searchStores
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    searchProducts,
    getProduct,
    browseCategories,
    searchStores,
    checkAvailability,
    getRecommendations,
    getOpenBoxOffers
  ],
  triggers: []
});
