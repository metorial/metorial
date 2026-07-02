import { Slate } from 'slates';
import { spec } from './spec';
import {
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
import { contactEvents, emailEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
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
  triggers: [emailEvents, contactEvents]
});
