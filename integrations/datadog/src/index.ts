import { Slate } from 'slates';
import { spec } from './spec';
import {
  deleteMonitor,
  getDashboard,
  listDashboards,
  listEvents,
  listHosts,
  listIncidents,
  listMonitors,
  listSlos,
  listSyntheticsTests,
  listUsers,
  manageDashboard,
  manageIncident,
  manageMonitor,
  manageSlo,
  manageSynthetics,
  muteMonitor,
  postEvent,
  queryMetrics,
  scheduleDowntime,
  searchLogs,
  submitLogs,
  submitMetrics,
  triggerSynthetics
} from './tools';
import {
  inboundWebhook,
  incidentUpdateTrigger,
  monitorAlertTrigger,
  newEventTrigger
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    queryMetrics,
    submitMetrics,
    manageMonitor,
    listMonitors,
    deleteMonitor,
    muteMonitor,
    manageDashboard,
    listDashboards,
    getDashboard,
    postEvent,
    listEvents,
    manageIncident,
    listIncidents,
    searchLogs,
    submitLogs,
    manageSlo,
    listSlos,
    manageSynthetics,
    listSyntheticsTests,
    triggerSynthetics,
    listUsers,
    listHosts,
    scheduleDowntime
  ],
  triggers: [inboundWebhook, monitorAlertTrigger, newEventTrigger, incidentUpdateTrigger]
});
