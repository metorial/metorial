import { Slate } from 'slates';
import { spec } from './spec';
import {
  categorizeDomain,
  checkParkedDomain,
  discoverDomains,
  findSimilarDomains,
  getCompanyData,
  getDomainLogo,
  getDomainRegistration,
  getIabCategories,
  getSocialMediaLinks,
  getTechStack,
  listCategories
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    categorizeDomain,
    getCompanyData,
    getDomainLogo,
    getSocialMediaLinks,
    getTechStack,
    findSimilarDomains,
    checkParkedDomain,
    getDomainRegistration,
    getIabCategories,
    listCategories,
    discoverDomains
  ],
  triggers: []
});
