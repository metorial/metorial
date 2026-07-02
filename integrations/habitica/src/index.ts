import { Slate } from 'slates';
import { spec } from './spec';
import {
  castSkill,
  createTask,
  deleteTask,
  getContent,
  getUserProfile,
  listTasks,
  manageChallenge,
  manageGroup,
  manageInventory,
  manageQuest,
  manageTags,
  scoreTask,
  sendMessage,
  updateTask
} from './tools';
import { groupChatReceived, questActivity, taskActivity, userActivity } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createTask,
    listTasks,
    updateTask,
    deleteTask,
    scoreTask,
    getUserProfile,
    castSkill,
    manageGroup,
    sendMessage,
    manageChallenge,
    manageTags,
    manageQuest,
    manageInventory,
    getContent
  ],
  triggers: [taskActivity, groupChatReceived, userActivity, questActivity]
});
