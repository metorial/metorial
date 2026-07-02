import { Slate } from 'slates';
import { spec } from './spec';
import {
  addFriend,
  createComment,
  createExpense,
  createGroup,
  deleteComment,
  deleteExpense,
  deleteFriend,
  deleteGroup,
  getCategories,
  getCurrencies,
  getCurrentUser,
  getExpense,
  getGroup,
  getUser,
  listComments,
  listExpenses,
  listFriends,
  listGroups,
  manageGroupMembers,
  updateExpense,
  updateUser
} from './tools';
import { accountActivity, inboundWebhook } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    getCurrentUser,
    getUser,
    updateUser,
    listGroups,
    getGroup,
    createGroup,
    manageGroupMembers,
    deleteGroup,
    listExpenses,
    getExpense,
    createExpense,
    updateExpense,
    deleteExpense,
    listFriends,
    addFriend,
    deleteFriend,
    listComments,
    createComment,
    deleteComment,
    getCurrencies,
    getCategories
  ],
  triggers: [inboundWebhook, accountActivity]
});
