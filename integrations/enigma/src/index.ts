import { Slate } from 'slates';
import { spec } from './spec';
import {
  countBusinesses,
  getAccount,
  graphqlQuery,
  lookupBusiness,
  matchBusiness,
  searchBusinesses,
  verifyBusiness
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    matchBusiness,
    lookupBusiness,
    verifyBusiness,
    graphqlQuery,
    searchBusinesses,
    getAccount,
    countBusinesses
  ],
  triggers: []
});
