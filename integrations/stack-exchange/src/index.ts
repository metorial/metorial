import { Slate } from 'slates';
import { spec } from './spec';
import {
  browseTags,
  getAnswers,
  getInbox,
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
import { inboundWebhook, newAnswers, newQuestions } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
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
  triggers: [inboundWebhook, newQuestions, newAnswers]
});
