import { Slate } from 'slates';
import { spec } from './spec';
import {
  attachTag,
  copyBoard,
  createBoard,
  createBoardItem,
  createConnector,
  createTag,
  deleteBoard,
  deleteBoardItem,
  deleteConnector,
  deleteTag,
  detachTag,
  getBoard,
  getBoardItems,
  getBoardMembers,
  getConnectors,
  getTags,
  listBoards,
  removeBoardMember,
  shareBoard,
  updateBoard,
  updateBoardItem,
  updateBoardMember
} from './tools';
import { boardItemChanges, inboundWebhook } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createBoard,
    getBoard,
    listBoards,
    updateBoard,
    deleteBoard,
    copyBoard,
    createBoardItem,
    updateBoardItem,
    getBoardItems,
    deleteBoardItem,
    createConnector,
    getConnectors,
    deleteConnector,
    createTag,
    getTags,
    attachTag,
    detachTag,
    deleteTag,
    shareBoard,
    getBoardMembers,
    updateBoardMember,
    removeBoardMember
  ],
  triggers: [inboundWebhook, boardItemChanges]
});
