import { Slate } from 'slates';
import { spec } from './spec';
import {
  listGroups,
  listUserPools,
  listUsers,
  manageAppClient,
  manageGroup,
  manageGroupMembership,
  manageIdentityPool,
  manageIdentityPoolRoles,
  manageIdentityProvider,
  manageResourceServer,
  manageUser,
  manageUserPool,
  manageUserPoolDomain
} from './tools';
import { groupChanges, inboundWebhook, userChanges } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listUserPools,
    manageUserPool,
    listUsers,
    manageUser,
    listGroups,
    manageGroup,
    manageGroupMembership,
    manageIdentityProvider,
    manageAppClient,
    manageIdentityPool,
    manageIdentityPoolRoles,
    manageResourceServer,
    manageUserPoolDomain
  ],
  triggers: [inboundWebhook, userChanges, groupChanges]
});
