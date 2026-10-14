import { Slate } from 'slates';
import { spec } from './spec';
import {
  addCommentTool,
  createPollTool,
  deletePollTool,
  getCommentsTool,
  getCurrentUserTool,
  getPollTool,
  listPollsTool,
  participateInPollTool,
  removeParticipantTool
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    getCurrentUserTool,
    createPollTool,
    getPollTool,
    listPollsTool,
    deletePollTool,
    participateInPollTool,
    removeParticipantTool,
    addCommentTool,
    getCommentsTool
  ],
  triggers: []
});
