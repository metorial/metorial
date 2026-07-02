import { Slate } from 'slates';
import { spec } from './spec';
import {
  createAgent,
  createBatchCall,
  createWebCall,
  deleteAgent,
  deleteCall,
  deleteKnowledgeBase,
  deletePhoneNumber,
  getAgent,
  getCall,
  getConcurrency,
  getKnowledgeBase,
  getPhoneNumber,
  listAgents,
  listCalls,
  listKnowledgeBases,
  listPhoneNumbers,
  listVoices,
  makePhoneCall,
  purchasePhoneNumber,
  updateAgent,
  updatePhoneNumber
} from './tools';
import { callEvents, transferEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listAgents,
    getAgent,
    createAgent,
    updateAgent,
    deleteAgent,
    makePhoneCall,
    createWebCall,
    getCall,
    listCalls,
    deleteCall,
    createBatchCall,
    listPhoneNumbers,
    getPhoneNumber,
    purchasePhoneNumber,
    updatePhoneNumber,
    deletePhoneNumber,
    listKnowledgeBases,
    getKnowledgeBase,
    deleteKnowledgeBase,
    listVoices,
    getConcurrency
  ],
  triggers: [callEvents, transferEvents]
});
