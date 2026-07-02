import { Slate } from 'slates';
import { spec } from './spec';
import {
  createGroup,
  deleteCollection,
  deleteGroup,
  getGroup,
  getMember,
  importOrganization,
  inviteMember,
  listCollections,
  listGroups,
  listMembers,
  listPolicies,
  queryEvents,
  reinviteMember,
  removeMember,
  revokeRestoreMember,
  updateCollection,
  updateGroup,
  updateMember,
  updatePolicy
} from './tools';
import { inboundWebhook, organizationEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listMembers,
    getMember,
    inviteMember,
    updateMember,
    removeMember,
    reinviteMember,
    revokeRestoreMember,
    listGroups,
    getGroup,
    createGroup,
    updateGroup,
    deleteGroup,
    listCollections,
    updateCollection,
    deleteCollection,
    listPolicies,
    updatePolicy,
    queryEvents,
    importOrganization
  ],
  triggers: [inboundWebhook, organizationEvents]
});
