import { Slate } from 'slates';
import { spec } from './spec';
import {
  getClusterMetricsTool,
  getPerformanceAdvisorTool,
  listEventsTool,
  listProjectsTool,
  manageAlertsTool,
  manageBackupsTool,
  manageClusterTool,
  manageDatabaseUserTool,
  manageIpAccessListTool,
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
    manageSearchIndexesTool,
    getPerformanceAdvisorTool,
    manageNetworkPeeringTool,
    listEventsTool,
    manageOnlineArchiveTool
  ],
  triggers: [alertWebhookTrigger, projectEventsTrigger]
});
