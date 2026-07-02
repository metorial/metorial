import { Slate } from 'slates';
import { spec } from './spec';
import {
  addProspect,
  addProspectsBulk,
  checkHealth,
  createCampaign,
  getCampaign,
  getProspect,
  listCampaigns
} from './tools';
import { videoEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listCampaigns,
    getCampaign,
    createCampaign,
    addProspect,
    addProspectsBulk,
    getProspect,
    checkHealth
  ],
  triggers: [videoEvents]
});
