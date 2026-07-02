import { Slate } from 'slates';
import { spec } from './spec';
import {
  getAssistant,
  listAssistants,
  listDataConnectors,
  listGriptapeTools,
  listKnowledgeBases,
  listRetrievers,
  listStructures,
  manageAssistant,
  manageBucket,
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
import { assistantRunCompleted, inboundWebhook, structureRunCompleted } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
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
  triggers: [inboundWebhook, assistantRunCompleted, structureRunCompleted]
});
