import { Slate } from 'slates';
import { spec } from './spec';
import {
  enrichCompany,
  enrichPerson,
  findDecisionMakers,
  getInvestorPortfolio,
  getSocialPosts,
  screenCompanies,
  searchCompanies,
  searchJobListings,
  searchPeople,
  webSearch
} from './tools';
import { companyScreeningPoll, inboundWebhook, peopleChangesPoll } from './triggers';

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
    findDecisionMakers
  ],
  triggers: [inboundWebhook, companyScreeningPoll, peopleChangesPoll]
});
