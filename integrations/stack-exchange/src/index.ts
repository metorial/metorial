import { Slate } from 'slates';
import { spec } from './spec';
import {
  acceptAnswer,
  browseTags,
  editAnswer,
  editQuestion,
  getAnswers,
  getInbox,
  getNotifications,
  getPostRevisions,
  getQuestion,
  getUser,
  getUserActivity,
  listSites,
  manageComment,
  postAnswer,
  postQuestion,
  searchQuestions
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    acceptAnswer,
    editAnswer,
    editQuestion,
    getNotifications,
    searchQuestions,
    getQuestion,
    getAnswers,
    getUser,
    getUserActivity,
    browseTags,
    getInbox,
    manageComment,
    postQuestion,
    postAnswer,
    getPostRevisions,
    listSites
  ],
  triggers: []
});
