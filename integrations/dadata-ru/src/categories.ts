import { toolCategory } from 'slates';
import {
  cleanAddress,
  cleanContactData,
  findAffiliatedCompanies,
  findNearbyPostalOffices,
  geocodeAddress,
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

export let toolCategories = [
  toolCategory({
    key: 'suggestions',
    name: 'DaData Suggestions',
    description:
      'Autocomplete, company and bank lookups, address geolocation, and reference directories.',
    tools: [
      suggestAddress,
      suggestCompany,
      lookupCompany,
      findAffiliatedCompanies,
      suggestBank,
      lookupBank,
      reverseGeocode,
      ipGeolocate,
      searchReferenceDirectory,
      lookupAddress,
      suggestName,
      suggestEmail,
      findNearbyPostalOffices
    ]
  }),
  toolCategory({
    key: 'clean',
    name: 'DaData Standardization',
    description:
      'Normalize and enrich addresses and contact data, including address geocoding.',
    tools: [cleanAddress, cleanContactData, geocodeAddress]
  }),
  toolCategory({
    key: 'company',
    name: 'DaData Company by Email',
    description: 'Enrich corporate email addresses with company data.',
    tools: [lookupCompanyByEmail]
  })
];
