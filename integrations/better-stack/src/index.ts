import { Slate } from 'slates';
import { spec } from './spec';
import {
  exportDashboard,
  listDashboards,
  listIncidents,
  listMonitors,
  manageAlert,
  manageHeartbeat,
  manageIncident,
  manageIncomingWebhook,
  manageMonitor,
  manageOnCall,
  manageSource,
  manageStatusPage
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listMonitors,
    manageMonitor,
    listIncidents,
    manageIncident,
    manageHeartbeat,
    manageStatusPage,
    manageOnCall,
    manageSource,
    listDashboards,
    manageAlert,
    manageIncomingWebhook,
    exportDashboard
  ],
  triggers: []
});
