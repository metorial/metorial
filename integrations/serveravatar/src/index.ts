import { Slate } from 'slates';
import { spec } from './spec';
import {
  createApplication,
  createServer,
  getServerDetails,
  listApplications,
  listBackups,
  listOrganizations,
  listServerProviders,
  listServers,
  manageApplication,
  manageCronJobs,
  manageDatabase,
  manageDomains,
  manageFirewall,
  manageServer,
  manageServices,
  manageSsl,
  manageSystemUsers
} from './tools';
import { applicationChanges, inboundWebhook, serverChanges } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listOrganizations,
    listServerProviders,
    listServers,
    getServerDetails,
    createServer,
    manageServer,
    manageServices,
    listApplications,
    createApplication,
    manageApplication,
    manageDomains,
    manageSsl,
    manageDatabase,
    manageFirewall,
    manageCronJobs,
    listBackups,
    manageSystemUsers
  ],
  triggers: [inboundWebhook, serverChanges, applicationChanges]
});
