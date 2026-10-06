import { Slate } from 'slates';
import { spec } from './spec';
import {
  inviteTeamMember,
  removeTeamMember,
  sendGroupNotification,
  sendNotification
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [sendNotification, sendGroupNotification, inviteTeamMember, removeTeamMember],
  triggers: []
});
