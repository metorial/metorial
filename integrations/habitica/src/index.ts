import { Slate } from 'slates';
import { spec } from './spec';
import {
  castSkill,
  createTask,
  deleteTask,
  getContent,
  getTask,
  getUserProfile,
  listTasks,
  manageChallenge,
  manageChecklist,
  manageGroup,
  manageInventory,
  manageQuest,
  manageTags,
  scoreTask,
  sendMessage,
  updateTask
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    createTask,
    listTasks,
    updateTask,
    deleteTask,
    scoreTask,
    getUserProfile,
    getTask,
    manageChecklist,
    castSkill,
    manageGroup,
    sendMessage,
    manageChallenge,
    manageTags,
    manageQuest,
    manageInventory,
    getContent
  ],
  triggers: []
});
