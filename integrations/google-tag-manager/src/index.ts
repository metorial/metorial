import { Slate } from 'slates';
import { spec } from './spec';
import {
  listAccounts,
  manageContainer,
  manageEnvironment,
  manageFolder,
  manageTag,
  manageTrigger,
  manageUserPermission,
  manageVariable,
  manageVersion,
  manageWorkspace,
  updateAccount
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listAccounts,
    updateAccount,
    manageContainer,
    manageWorkspace,
    manageTag,
    manageTrigger,
    manageVariable,
    manageVersion,
    manageEnvironment,
    manageFolder,
    manageUserPermission
  ],
  triggers: []
});
