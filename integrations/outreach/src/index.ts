import { Slate } from 'slates';
import { spec } from './spec';
import {
  createCall,
  getProspect,
  listAccounts,
  listMailings,
  listOpportunities,
  listProspects,
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
import {
  accountEvents,
  callEvents,
  mailingEvents,
  opportunityEvents,
  prospectEvents,
  sequenceEvents,
  sequenceStateEvents,
  taskEvents
} from './triggers';

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
    manageSequenceState,
    listMailings,
    manageTask,
    listTasks,
    manageOpportunity,
    listOpportunities,
    manageTemplate,
    manageSnippet,
    createCall,
    listUsers
  ],
  triggers: [
    prospectEvents,
    accountEvents,
    mailingEvents,
    sequenceEvents,
    sequenceStateEvents,
    taskEvents,
    opportunityEvents,
    callEvents
  ]
});
