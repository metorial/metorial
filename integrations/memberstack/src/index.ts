import { Slate } from 'slates';
import { spec } from './spec';
import {
  createMember,
  deleteMember,
  getMember,
  listMembers,
  manageMemberPlan,
  updateMember,
  verifyToken
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listMembers,
    getMember,
    createMember,
    updateMember,
    deleteMember,
    manageMemberPlan,
    verifyToken
  ],
  triggers: []
});
