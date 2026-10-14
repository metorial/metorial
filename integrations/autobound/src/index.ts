import { Slate } from 'slates';
import { spec } from './spec';
import {
  enrichCompany,
  enrichContact,
  generateContent,
  generateInsights,
  getAccount,
  importCampaignContact,
  listSignalTypes
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    generateContent,
    generateInsights,
    importCampaignContact,
    enrichCompany,
    enrichContact,
    getAccount,
    listSignalTypes
  ],
  triggers: []
});
