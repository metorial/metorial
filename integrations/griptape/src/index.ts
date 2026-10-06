import { Slate } from 'slates';
import { spec } from './spec';
import {
  getAssistant,
  getFileUrl,
  getResource,
  listAssistants,
  listDataConnectors,
  listGriptapeTools,
  listKnowledgeBases,
  listRetrievers,
  listStructures,
  manageAssistant,
  manageBucket,
  manageDataJob,
  manageKnowledgeBase,
  manageKnowledgeBaseJob,
  manageMessage,
  manageRuleset,
  manageThread,
  queryKnowledgeBase,
  queryRetriever,
  runAssistant,
  runStructure,
  runToolActivity
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getFileUrl,
    getResource,
    manageDataJob,
    manageKnowledgeBase,
    manageAssistant,
    listAssistants,
    getAssistant,
    runAssistant,
    runStructure,
    listStructures,
    queryKnowledgeBase,
    listKnowledgeBases,
    manageKnowledgeBaseJob,
    manageThread,
    manageMessage,
    manageRuleset,
    queryRetriever,
    listRetrievers,
    runToolActivity,
    listGriptapeTools,
    listDataConnectors,
    manageBucket
  ],
  triggers: []
});
