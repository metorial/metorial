import { Slate } from 'slates';
import { spec } from './spec';
import {
  autocomplete,
  bulkEnrichCompany,
  bulkEnrichPerson,
  cleanCompany,
  cleanLocation,
  cleanSchool,
  enrichCompany,
  enrichIp,
  enrichJobTitle,
  enrichPerson,
  enrichSkill,
  identifyPerson,
  retrievePerson,
  searchCompany,
  searchPerson
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    enrichPerson,
    searchPerson,
    identifyPerson,
    retrievePerson,
    enrichCompany,
    searchCompany,
    enrichIp,
    enrichJobTitle,
    enrichSkill,
    cleanCompany,
    cleanLocation,
    cleanSchool,
    autocomplete,
    bulkEnrichPerson,
    bulkEnrichCompany
  ],
  triggers: []
});
