import { Slate } from 'slates';
import { spec } from './spec';
import {
  enrichCompany,
  enrichPerson,
  findDecisionMakers,
  getCreditBalance,
  getInvestorPortfolio,
  getSocialPosts,
  listEndpointPermissions,
  screenCompanies,
  searchCompanies,
  searchJobListings,
  searchPeople,
  webSearch
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    enrichCompany,
    searchCompanies,
    screenCompanies,
    enrichPerson,
    searchPeople,
    searchJobListings,
    getSocialPosts,
    webSearch,
    getInvestorPortfolio,
    findDecisionMakers,
    getCreditBalance,
    listEndpointPermissions
  ],
  triggers: []
});
