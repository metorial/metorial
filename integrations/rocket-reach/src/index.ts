import { Slate } from 'slates';
import { spec } from './spec';
import {
  checkLookupStatus,
  getAccount,
  lookupCompany,
  lookupPerson,
  searchCompanies,
  searchPeople
} from './tools';
import { lookupCompleted } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    searchPeople,
    lookupPerson,
    checkLookupStatus,
    searchCompanies,
    lookupCompany,
    getAccount
  ],
  triggers: [lookupCompleted]
});
