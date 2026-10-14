import { Slate } from 'slates';
import { spec } from './spec';
import {
  createUser,
  getAccount,
  getCustomFields,
  listConversations,
  listTimeOffRequests,
  listUsers,
  manageForms,
  manageJobs,
  manageOnboarding,
  manageScheduler,
  manageTasks,
  manageTimeClock,
  manageTimeOff,
  sendChatMessage,
  updateUser
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listUsers,
    getAccount,
    createUser,
    updateUser,
    getCustomFields,
    manageTimeClock,
    manageTimeOff,
    listTimeOffRequests,
    manageScheduler,
    manageJobs,
    manageForms,
    manageTasks,
    sendChatMessage,
    listConversations,
    manageOnboarding
  ],
  triggers: []
});
