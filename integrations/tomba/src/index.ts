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
  getLead,
  getUsage,
  linkedinFinder,
  listLeadLists,
  listLeads,
  phoneFinder,
  updateLead,
  updateLeadList
} from './tools';
import { leadSaved } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    domainSearch,
    emailFinder,
    emailVerifier,
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
  triggers: [leadSaved]
});
