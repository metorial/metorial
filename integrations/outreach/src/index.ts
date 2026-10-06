import { Slate } from 'slates';
import { spec } from './spec';
import {
  createCall,
  getProspect,
  listAccounts,
  listMailings,
  listMetadata,
  listOpportunities,
  listProspects,
  listSequenceStates,
  listSequences,
  listTasks,
  listUsers,
  manageAccount,
  manageOpportunity,
  manageProspect,
  manageSequence,
  manageSequenceState,
  manageSnippet,
  manageTask,
  manageTemplate
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    manageProspect,
    getProspect,
    listProspects,
    manageAccount,
    listAccounts,
    manageSequence,
    listSequences,
    listSequenceStates,
    manageSequenceState,
    listMailings,
    listMetadata,
    manageTask,
    listTasks,
    manageOpportunity,
    listOpportunities,
    manageTemplate,
    manageSnippet,
    createCall,
    listUsers
  ],
  triggers: []
});
