import { Slate } from 'slates';
import { spec } from './spec';
import {
  addUsersToWidget,
  createManager,
  createUser,
  createWidget,
  deleteManager,
  deleteUser,
  deleteWidget,
  getCall,
  getUser,
  getWidget,
  initiateCall,
  listCalls,
  listManagers,
  listSmsTemplates,
  listUsers,
  listVoiceMessages,
  listWidgets,
  resetSmsTemplate,
  resetVoiceMessage,
  updateCallField,
  updateManager,
  updateUser,
  updateWidget,
  upsertSmsTemplate,
  upsertVoiceMessage
} from './tools';
import { callEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listCalls,
    getCall,
    updateCallField,
    initiateCall,
    listWidgets,
    getWidget,
    createWidget,
    updateWidget,
    deleteWidget,
    addUsersToWidget,
    listUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser,
    listManagers,
    createManager,
    updateManager,
    deleteManager,
    listSmsTemplates,
    upsertSmsTemplate,
    resetSmsTemplate,
    listVoiceMessages,
    upsertVoiceMessage,
    resetVoiceMessage
  ],
  triggers: [callEvents]
});
