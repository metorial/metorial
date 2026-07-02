import { Slate } from 'slates';
import { spec } from './spec';
import {
  getCallTranscript,
  listAssistants,
  listCalls,
  listFiles,
  listPhoneNumbers,
  manageAssistant,
  manageCall,
  manageCampaign,
  managePhoneNumber,
  manageSquad,
  manageTool,
  manageWorkflow
} from './tools';
import { assistantRequest, callEvent, toolCallRequest } from './triggers';

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
    listFiles
  ],
  triggers: [callEvent, assistantRequest, toolCallRequest]
});
