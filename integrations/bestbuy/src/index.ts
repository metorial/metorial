import { Slate } from 'slates';
import { spec } from './spec';
import {
  browseCatalog,
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
    browseCatalog,
    getProduct,
    browseCategories,
    searchStores,
    checkAvailability,
    getRecommendations,
    getOpenBoxOffers
  ],
  triggers: []
});
