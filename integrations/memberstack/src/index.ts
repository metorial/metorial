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
import { memberEvents, planConnectionEvents } from './triggers';

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
  triggers: [memberEvents, planConnectionEvents]
});
