import { Slate } from 'slates';
import { toolCategories } from './categories';
import { spec } from './spec';
import {
  cleanAddress,
  cleanContactData,
  findAffiliatedCompanies,
  findNearbyPostalOffices,
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
  suggestCompany,
  suggestEmail,
  suggestName
} from './tools';

export let provider = Slate.create({
  spec,
  toolCategories,
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
    lookupAddress,
    suggestName,
    suggestEmail,
    findNearbyPostalOffices
  ],
  triggers: []
});
