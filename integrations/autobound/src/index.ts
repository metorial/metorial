import { Slate } from 'slates';
import { spec } from './spec';
import {
  enrichCompany,
  generateContent,
  generateInsights,
  importCampaignContact
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [generateContent, generateInsights, importCampaignContact, enrichCompany],
  triggers: []
});
