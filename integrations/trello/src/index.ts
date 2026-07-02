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
  manageBoard,
  manageCard,
  manageCardMembers,
  manageChecklist,
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
    manageCardMembers,
    search,
    getBoardMembers,
    addAttachment,
    getActivity
  ],
  triggers: [boardActivity]
});
