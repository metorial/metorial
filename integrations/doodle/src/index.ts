import { Slate } from 'slates';
import { spec } from './spec';
import {
  addCommentTool,
  createPollTool,
  deletePollTool,
  getCommentsTool,
  getPollTool,
  listPollsTool,
  participateInPollTool,
  removeParticipantTool
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    createPollTool,
    getPollTool,
    listPollsTool,
    deletePollTool,
    participateInPollTool,
    removeParticipantTool,
    addCommentTool,
    getCommentsTool
  ],
  triggers: [inboundWebhook]
});
