import { Slate } from 'slates';
import { spec } from './spec';
import {
  archiveCardTool,
  blockCardTool,
  createCardTool,
  deleteCardTool,
  getBoardTool,
  getCardTool,
  getCurrentUserTool,
  listBlockReasonsTool,
  listBoardsTool,
  listCardsTool,
  listCardTypesTool,
  listUsersTool,
  listWorkspacesTool,
  logTimeTool,
  manageCardLinksTool,
  manageCommentsTool,
  manageCustomFieldsTool,
  manageSubtasksTool,
  updateCardTool
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listWorkspacesTool,
    listBlockReasonsTool,
    listBoardsTool,
    listCardTypesTool,
    getBoardTool,
    listCardsTool,
    getCardTool,
    getCurrentUserTool,
    createCardTool,
    updateCardTool,
    deleteCardTool,
    archiveCardTool,
    manageCommentsTool,
    manageSubtasksTool,
    manageCardLinksTool,
    manageCustomFieldsTool,
    listUsersTool,
    logTimeTool,
    blockCardTool
  ],
  triggers: []
});
