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
  manageKnowledgeBaseSource,
  manageSubaccount,
  runSimulation,
  updateAgent
} from './tools';
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
    manageKnowledgeBaseSource,
    listVoices,
    manageContact,
    manageAction,
    listPhoneNumbers,
    exportAnalytics,
    manageSubaccount,
    runSimulation
  ],
  triggers: []
});
