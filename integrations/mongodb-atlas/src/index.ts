import { Slate } from 'slates';
import { spec } from './spec';
import {
  getClusterMetricsTool,
  getPerformanceAdvisorTool,
  listAccessLogsTool,
  listEventsTool,
  listProjectsTool,
  manageAlertsTool,
  manageBackupsTool,
  manageClusterTool,
  manageDatabaseUserTool,
  manageFlexClusterTool,
  manageIpAccessListTool,
  manageMaintenanceWindowTool,
  manageNetworkPeeringTool,
  manageOnlineArchiveTool,
  manageSearchIndexesTool
} from './tools';
import { alertWebhookTrigger, projectEventsTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listProjectsTool,
    manageClusterTool,
    manageDatabaseUserTool,
    manageIpAccessListTool,
    manageAlertsTool,
    manageBackupsTool,
    getClusterMetricsTool,
    listAccessLogsTool,
    manageSearchIndexesTool,
    getPerformanceAdvisorTool,
    manageFlexClusterTool,
    manageNetworkPeeringTool,
    manageMaintenanceWindowTool,
    listEventsTool,
    manageOnlineArchiveTool
  ],
  triggers: [alertWebhookTrigger, projectEventsTrigger]
});
