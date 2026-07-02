import { Slate } from 'slates';
import { spec } from './spec';
import {
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
import { inboundWebhook, incidentEvents, monitorEvents } from './triggers';

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
    manageIncomingWebhook
  ],
  triggers: [inboundWebhook, incidentEvents, monitorEvents]
});
