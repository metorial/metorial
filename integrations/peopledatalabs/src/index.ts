import { Slate } from 'slates';
import { spec } from './spec';
import {
  autocomplete,
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

import { inboundWebhook } from './triggers/inbound-webhook';

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
    autocomplete
  ],
  triggers: [inboundWebhook]
});
