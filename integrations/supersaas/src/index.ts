import { Slate } from 'slates';
import { spec } from './spec';
import {
  checkAvailabilityTool,
  createAppointmentTool,
  createUserTool,
  deleteAppointmentTool,
  deletePromotionTool,
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
  listSlotsTool,
  listUsersTool,
  updateAppointmentTool,
  updateUserTool
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listSchedulesTool,
    listSlotsTool,
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
    deletePromotionTool,
    getRecentChangesTool
  ],
  triggers: []
});
