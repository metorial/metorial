import { Slate } from 'slates';
import { spec } from './spec';
import {
  checkAvailabilityTool,
  createAppointmentTool,
  createUserTool,
  deleteAppointmentTool,
  deleteUserTool,
  duplicatePromotionTool,
  getAppointmentTool,
  getFormEntriesTool,
  getPromotionTool,
  getRecentChangesTool,
  getUserAgendaTool,
  getUserTool,
  listAppointmentsTool,
  listFormTemplatesTool,
  listPromotionsTool,
  listResourcesTool,
  listSchedulesTool,
  listUsersTool,
  updateAppointmentTool,
  updateUserTool
} from './tools';
import { appointmentChangesTrigger, formChangesTrigger, userChangesTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listSchedulesTool,
    listResourcesTool,
    listUsersTool,
    getUserTool,
    createUserTool,
    updateUserTool,
    deleteUserTool,
    listAppointmentsTool,
    getAppointmentTool,
    getUserAgendaTool,
    createAppointmentTool,
    updateAppointmentTool,
    deleteAppointmentTool,
    checkAvailabilityTool,
    listFormTemplatesTool,
    getFormEntriesTool,
    listPromotionsTool,
    getPromotionTool,
    duplicatePromotionTool,
    getRecentChangesTool
  ],
  triggers: [appointmentChangesTrigger, userChangesTrigger, formChangesTrigger]
});
