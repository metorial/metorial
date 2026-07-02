import { Slate } from 'slates';
import { spec } from './spec';
import {
  addContact,
  addMember,
  listAccounts,
  listContacts,
  listLists,
  listTeams,
  removeAccount
} from './tools';
import { callCompleted, contactUpdated } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listLists,
    listContacts,
    addContact,
    addMember,
    listAccounts,
    removeAccount,
    listTeams
  ],
  triggers: [callCompleted, contactUpdated]
});
