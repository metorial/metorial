import { Slate } from 'slates';
import { spec } from './spec';
import {
  getBillingTool,
  getMetricsTool,
  getNetworkInfoTool,
  listClustersTool,
  listEventsTool,
  listOrganizationsTool,
  listProjectsTool,
  manageAlertConfigurationsTool,
  manageAlertsTool,
  manageBackupsTool,
  manageClusterTool,
  manageDatabaseUserTool,
  manageIpAccessListTool,
  manageProjectTool,
  manageSearchIndexesTool
} from './tools';
import { alertWebhookTrigger, projectEventsTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listOrganizationsTool,
    listProjectsTool,
    manageProjectTool,
    listClustersTool,
    manageClusterTool,
    manageDatabaseUserTool,
    manageIpAccessListTool,
    manageAlertsTool,
    manageAlertConfigurationsTool,
    manageBackupsTool,
    manageSearchIndexesTool,
    getMetricsTool,
    getNetworkInfoTool,
    listEventsTool,
    getBillingTool
  ],
  triggers: [alertWebhookTrigger, projectEventsTrigger]
});
