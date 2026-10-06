import { Slate } from 'slates';
import { spec } from './spec';
import {
  getCurrentUser,
  getSequence,
  getStatistics,
  getTeamPerformance,
  listContacts,
  listEmailAccounts,
  listSchedules,
  listSequences,
  manageBlacklist,
  manageContact,
  manageContactList,
  manageSequence,
  manageSequenceContacts,
  manageTask,
  manageTemplate,
  pushContactToCampaign
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getCurrentUser,
    listSequences,
    getSequence,
    manageSequence,
    listContacts,
    manageContact,
    manageSequenceContacts,
    manageTemplate,
    listEmailAccounts,
    manageBlacklist,
    manageContactList,
    getStatistics,
    getTeamPerformance,
    manageTask,
    listSchedules,
    pushContactToCampaign
  ],
  triggers: []
});
