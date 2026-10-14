import { Slate } from 'slates';
import { spec } from './spec';
import {
  authorFinder,
  createLead,
  createLeadList,
  deleteLead,
  deleteLeadList,
  domainIntelligence,
  domainSearch,
  emailFinder,
  emailVerifier,
  enrich,
  getAccount,
  getEmailFormats,
  getEmailSources,
  getLead,
  getUsage,
  linkedinFinder,
  listLeadLists,
  listLeads,
  phoneFinder,
  updateLead,
  updateLeadList
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    domainSearch,
    emailFinder,
    emailVerifier,
    getEmailFormats,
    getEmailSources,
    authorFinder,
    linkedinFinder,
    enrich,
    phoneFinder,
    domainIntelligence,
    listLeads,
    getLead,
    createLead,
    updateLead,
    deleteLead,
    listLeadLists,
    createLeadList,
    updateLeadList,
    deleteLeadList,
    getAccount,
    getUsage
  ],
  triggers: []
});
