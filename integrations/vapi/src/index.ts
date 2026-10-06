import { Slate } from 'slates';
import { spec } from './spec';
import {
  downloadCallArtifact,
  getCallTranscript,
  listAssistants,
  listCalls,
  listCampaigns,
  listFiles,
  listPhoneNumbers,
  listSquads,
  listTools,
  manageAssistant,
  manageCall,
  manageCampaign,
  manageFile,
  managePhoneNumber,
  manageSquad,
  manageTool,
  manageWorkflow
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    manageAssistant,
    listAssistants,
    manageCall,
    listCalls,
    getCallTranscript,
    managePhoneNumber,
    listPhoneNumbers,
    manageSquad,
    manageWorkflow,
    manageTool,
    manageCampaign,
    listFiles,
    listSquads,
    listTools,
    listCampaigns,
    downloadCallArtifact,
    manageFile
  ],
  triggers: []
});
