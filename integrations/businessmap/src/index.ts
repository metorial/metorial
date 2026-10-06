import { Slate } from 'slates';
import { spec } from './spec';
import {
  archiveCardTool,
  blockCardTool,
  createCardTool,
  deleteCardTool,
  getBoardTool,
  getCardTool,
  listBoardsTool,
  listCardsTool,
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
    listBoardsTool,
    getBoardTool,
    listCardsTool,
    getCardTool,
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
