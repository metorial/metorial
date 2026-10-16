import { toolCategory } from 'slates';
import {
  describeBrand,
  downloadBrandImage,
  getLogoUrl,
  lookupBrand,
  searchBrands
} from './tools';

export let toolCategories = [
  toolCategory({
    key: 'cdn',
    name: 'Logo CDN',
    description: 'Create image URLs for displaying company logos in websites and apps.',
    tools: [getLogoUrl]
  }),
  toolCategory({
    key: 'brand-api',
    name: 'Brand API',
    description:
      'Brand profiles, colors, social links, and downloadable logo and brandmark files.',
    tools: [describeBrand, lookupBrand, downloadBrandImage]
  }),
  toolCategory({
    key: 'search-api',
    name: 'Search API',
    description: 'Find company domains and logos by brand name.',
    tools: [searchBrands]
  })
];
