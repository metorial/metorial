import { Slate } from 'slates';
import { spec } from './spec';
import {
  addAttachment,
  addComment,
  getActivity,
  getBoardMembers,
  getBoards,
  getCard,
  getCards,
  getLists,
  getNotifications,
  getWorkspaces,
  manageAttachments,
  manageBoard,
  manageCard,
  manageCardMembers,
  manageChecklist,
  manageComments,
  manageCustomFields,
  manageLabels,
  manageList,
  search
} from './tools';
import { boardActivity } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    getBoards,
    manageBoard,
    getLists,
    manageList,
    getCards,
    getCard,
    manageCard,
    manageChecklist,
    manageLabels,
    addComment,
    manageComments,
    manageCardMembers,
    search,
    getBoardMembers,
    addAttachment,
    manageAttachments,
    manageCustomFields,
    getWorkspaces,
    getNotifications,
    getActivity
  ],
  triggers: [boardActivity]
});
