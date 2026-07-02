import { Slate } from 'slates';
import { spec } from './spec';
import {
  cleanAddress,
  cleanContactData,
  findAffiliatedCompanies,
  geocodeAddress,
  getAccountInfo,
  ipGeolocate,
  lookupAddress,
  lookupBank,
  lookupCompany,
  lookupCompanyByEmail,
  reverseGeocode,
  searchReferenceDirectory,
  suggestAddress,
  suggestBank,
  suggestCompany
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    suggestAddress,
    cleanAddress,
    suggestCompany,
    lookupCompany,
    findAffiliatedCompanies,
    lookupCompanyByEmail,
    suggestBank,
    lookupBank,
    cleanContactData,
    geocodeAddress,
    reverseGeocode,
    ipGeolocate,
    searchReferenceDirectory,
    getAccountInfo,
    lookupAddress
  ],
  triggers: [inboundWebhook]
});
