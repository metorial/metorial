import { Slate } from 'slates';
import { spec } from './spec';
import {
  createUser,
  getCustomFields,
  listConversations,
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
import {
  formSubmissionEvents,
  schedulerEvents,
  taskEvents,
  timeActivityEvents,
  userEvents
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listUsers,
    createUser,
    updateUser,
    getCustomFields,
    manageTimeClock,
    manageTimeOff,
    manageScheduler,
    manageJobs,
    manageForms,
    manageTasks,
    sendChatMessage,
    listConversations,
    manageOnboarding
  ],
  triggers: [userEvents, timeActivityEvents, formSubmissionEvents, schedulerEvents, taskEvents]
});
