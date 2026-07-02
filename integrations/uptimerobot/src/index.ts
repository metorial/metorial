import { Slate } from 'slates';
import { spec } from './spec';
import {
  createAlertContact,
  createMaintenanceWindow,
  createMonitor,
  createStatusPage,
  deleteAlertContact,
  deleteMaintenanceWindow,
  deleteMonitor,
  deleteStatusPage,
  getAccountDetails,
  listAlertContacts,
  listMaintenanceWindows,
  listMonitors,
  listStatusPages,
  updateMonitor
} from './tools';
import { inboundWebhook, monitorStatusChanges } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listMonitors,
    createMonitor,
    updateMonitor,
    deleteMonitor,
    listAlertContacts,
    createAlertContact,
    deleteAlertContact,
    listStatusPages,
    createStatusPage,
    deleteStatusPage,
    listMaintenanceWindows,
    createMaintenanceWindow,
    deleteMaintenanceWindow,
    getAccountDetails
  ],
  triggers: [inboundWebhook, monitorStatusChanges]
});
