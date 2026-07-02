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
  listLeads,
  manageLead,
  manageLeadsList,
  manageSequence
} from './tools';
import { sequenceEmailEvent } from './triggers';

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
    getAccount
  ],
  triggers: [sequenceEmailEvent]
});
