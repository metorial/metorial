import { Slate } from 'slates';
import { spec } from './spec';
import {
  listDnsRecordsTool,
  listWorkersTool,
  listZonesTool,
  manageAccountTool,
  manageDnsRecordTool,
  manageDomainsTool,
  manageFirewallRulesTool,
  manageKvTool,
  manageLoadBalancerTool,
  manageNotificationsTool,
  managePagesTool,
  manageR2BucketsTool,
  manageSslCertificatesTool,
  manageStreamTool,
  manageWorkerRoutesTool,
  manageZoneTool,
  purgeCacheTool,
  queryAnalyticsTool,
  updateZoneSettingsTool
} from './tools';
import {
  dnsRecordChangesTrigger,
  notificationWebhookTrigger,
  zoneStatusChangesTrigger
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listDnsRecordsTool,
    manageDnsRecordTool,
    listZonesTool,
    manageZoneTool,
    purgeCacheTool,
    updateZoneSettingsTool,
    manageFirewallRulesTool,
    listWorkersTool,
    manageWorkerRoutesTool,
    manageKvTool,
    manageR2BucketsTool,
    manageLoadBalancerTool,
    managePagesTool,
    manageSslCertificatesTool,
    manageAccountTool,
    queryAnalyticsTool,
    manageDomainsTool,
    manageStreamTool,
    manageNotificationsTool
  ],
  triggers: [notificationWebhookTrigger, dnsRecordChangesTrigger, zoneStatusChangesTrigger]
});
