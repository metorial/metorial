import { Slate } from 'slates';
import { spec } from './spec';
import {
  createAgent,
  deleteAgent,
  exportAnalytics,
  getAgent,
  getCall,
  listAgents,
  listCalls,
  listPhoneNumbers,
  listVoices,
  makeCall,
  manageAction,
  manageContact,
  manageKnowledgeBase,
  manageSubaccount,
  runSimulation,
  updateAgent
} from './tools';
import { callCompletedPolling, inboundCallWebhook, postCallWebhook } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listAgents,
    getAgent,
    createAgent,
    updateAgent,
    deleteAgent,
    makeCall,
    getCall,
    listCalls,
    manageKnowledgeBase,
    listVoices,
    manageContact,
    manageAction,
    listPhoneNumbers,
    exportAnalytics,
    manageSubaccount,
    runSimulation
  ],
  triggers: [postCallWebhook, inboundCallWebhook, callCompletedPolling]
});
