import { Slate } from 'slates';
import { spec } from './spec';
import {
  deleteLead,
  discoverCompanies,
  domainSearch,
  emailCount,
  emailFinder,
  emailVerifier,
  enrichCompany,
  enrichPerson,
  getAccount,
  getLead,
  listLeads,
  manageLead,
  manageLeadsList,
  manageSequence
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    domainSearch,
    emailFinder,
    emailVerifier,
    enrichPerson,
    enrichCompany,
    discoverCompanies,
    emailCount,
    manageLead,
    listLeads,
    deleteLead,
    manageLeadsList,
    manageSequence,
    getAccount,
    getLead
  ],
  triggers: []
});
