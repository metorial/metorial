import { Slate } from 'slates';
import { spec } from './spec';
import {
  autocompleteCompany,
  checkRisk,
  discoverCompanies,
  enrichCombined,
  enrichCompany,
  enrichPerson,
  findProspects,
  nameToDomain,
  revealCompany
} from './tools';
import { audienceWebhook, enrichmentWebhook } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    enrichPerson,
    enrichCompany,
    enrichCombined,
    revealCompany,
    findProspects,
    discoverCompanies,
    nameToDomain,
    checkRisk,
    autocompleteCompany
  ],
  triggers: [enrichmentWebhook, audienceWebhook]
});
