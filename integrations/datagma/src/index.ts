import { Slate } from 'slates';
import { spec } from './spec';
import {
  detectJobChange,
  enrichCompany,
  enrichPerson,
  enrichTwitter,
  findEmail,
  findPeople,
  findVerifiedEmail,
  getCreditBalance,
  reverseLookup,
  searchPhone
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    enrichPerson,
    enrichCompany,
    findEmail,
    findVerifiedEmail,
    searchPhone,
    reverseLookup,
    detectJobChange,
    findPeople,
    enrichTwitter,
    getCreditBalance
  ],
  triggers: []
});
