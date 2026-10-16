import { Slate } from 'slates';
import { spec } from './spec';
import {
  addProspect,
  addProspectsBulk,
  checkHealth,
  createCampaign,
  downloadTranscript,
  getCampaign,
  getDynamicsSettings,
  getProspect,
  getTranscript,
  getTranscriptStatus,
  getWorkspace,
  listCampaigns,
  listWorkspaces,
  updateCampaignSettings
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listCampaigns,
    getCampaign,
    createCampaign,
    addProspect,
    addProspectsBulk,
    getProspect,
    checkHealth,
    getWorkspace,
    listWorkspaces,
    getDynamicsSettings,
    updateCampaignSettings,
    getTranscript,
    getTranscriptStatus,
    downloadTranscript
  ],
  triggers: []
});
