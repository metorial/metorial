import { toolCategory } from 'slates';
import {
  enrichTransaction,
  getBrand,
  getBrandContext,
  getLogoUrl,
  searchBrands
} from './tools';

export let toolCategories = [
  toolCategory({
    key: 'brand-api',
    name: 'Brand API',
    description: 'Company brand assets, colors, fonts, and firmographic data.',
    tools: [getBrand]
  }),
  toolCategory({
    key: 'brand-context-api',
    name: 'Brand Context API',
    description:
      'Brand positioning, audience, products, voice, visual style, and competitors.',
    tools: [getBrandContext]
  }),
  toolCategory({
    key: 'brand-search-api',
    name: 'Brand Search API',
    description: 'Find matching brand names, domains, and icons.',
    tools: [searchBrands]
  }),
  toolCategory({
    key: 'transaction-api',
    name: 'Transaction API',
    description: 'Resolve payment transaction descriptors to merchant brands.',
    tools: [enrichTransaction]
  }),
  toolCategory({
    key: 'logo-api',
    name: 'Logo API',
    description: 'Create logo URLs for direct embedding in applications.',
    tools: [getLogoUrl]
  })
];
