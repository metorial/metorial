import { Slate } from 'slates';
import { spec } from './spec';
import {
  createGroup,
  deleteCollection,
  deleteGroup,
  getCollection,
  getGroup,
  getMember,
  getPolicy,
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
    getCollection,
    updateCollection,
    deleteCollection,
    listPolicies,
    getPolicy,
    updatePolicy,
    queryEvents,
    importOrganization
  ],
  triggers: []
});
