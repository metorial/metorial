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
  getMonitor,
  listAlertContacts,
  listCurrentMonitors,
  listIncidents,
  listMaintenanceWindows,
  listMonitors,
  listStatusPages,
  manageMonitor,
  updateMonitor,
  whoAmI
} from './tools';
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
    getAccountDetails,
    whoAmI,
    listCurrentMonitors,
    getMonitor,
    manageMonitor,
    listIncidents
  ],
  triggers: []
});
