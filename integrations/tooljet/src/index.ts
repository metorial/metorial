import { Slate } from 'slates';
import { spec } from './spec';
import {
  createUser,
  exportApp,
  getUser,
  importApp,
  listApps,
  listUsers,
  listWorkspaces,
  manageUserWorkspaces,
  triggerWorkflow,
  updateUser,
  updateUserRole
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    listUsers,
    getUser,
    createUser,
    updateUser,
    updateUserRole,
    listWorkspaces,
    manageUserWorkspaces,
    listApps,
    exportApp,
    importApp,
    triggerWorkflow
  ],
  triggers: [inboundWebhook]
});
