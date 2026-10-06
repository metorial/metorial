import { Slate } from 'slates';
import { spec } from './spec';
import {
  createAgent,
  deleteAgent,
  getAccountInfo,
  getAgent,
  getBatch,
  getExecution,
  listAgents,
  listExecutions,
  listPhoneNumbers,
  listVoiceProviders,
  listVoices,
  makeCall,
  manageBatch,
  manageKnowledgeBase,
  setupInbound,
  stopCall,
  updateAgent
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    createAgent,
    getAgent,
    listAgents,
    updateAgent,
    deleteAgent,
    makeCall,
    stopCall,
    manageBatch,
    getBatch,
    getExecution,
    listExecutions,
    manageKnowledgeBase,
    listPhoneNumbers,
    setupInbound,
    listVoices,
    listVoiceProviders,
    getAccountInfo
  ],
  triggers: []
});
