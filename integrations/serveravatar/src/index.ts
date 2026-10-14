import { Slate } from 'slates';
import { spec } from './spec';
import {
  createApplication,
  createServer,
  getOrganization,
  getServerDetails,
  listApplications,
  listBackups,
  listOrganizations,
  listServerProviders,
  listServers,
  listTimezones,
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
export let provider = Slate.create({
  spec,
  tools: [
    listOrganizations,
    getOrganization,
    listTimezones,
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
  triggers: []
});
