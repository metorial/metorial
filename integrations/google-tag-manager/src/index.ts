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
  manageWorkspace
} from './tools';
import { inboundWebhook, versionPublished, workspaceChanged } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listAccounts,
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
  triggers: [inboundWebhook, versionPublished, workspaceChanged]
});
