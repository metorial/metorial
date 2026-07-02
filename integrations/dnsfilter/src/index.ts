import { Slate } from 'slates';
import { spec } from './spec';
import {
  createOrganization,
  getBilling,
  getOrganization,
  getQueryLog,
  getTrafficReport,
  listCategories,
  listNetworks,
  listOrganizations,
  listPolicies,
  listRoamingClients,
  lookupDomain,
  manageBlockPage,
  manageCollection,
  manageCollectionUsers,
  manageIpAddresses,
  manageMacAddresses,
  manageNetwork,
  manageNetworkSecretKey,
  manageOrganizationUsers,
  managePolicy,
  manageRoamingClient,
  manageScheduledPolicy,
  suggestDomainCategorization,
  updateOrganization
} from './tools';
import {
  inboundWebhook,
  networkChanges,
  organizationChanges,
  policyChanges,
  roamingClientChanges
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listOrganizations,
    getOrganization,
    createOrganization,
    updateOrganization,
    listPolicies,
    managePolicy,
    manageScheduledPolicy,
    listNetworks,
    manageNetwork,
    manageNetworkSecretKey,
    manageIpAddresses,
    listRoamingClients,
    manageRoamingClient,
    manageOrganizationUsers,
    manageCollection,
    manageCollectionUsers,
    manageBlockPage,
    lookupDomain,
    suggestDomainCategorization,
    listCategories,
    manageMacAddresses,
    getTrafficReport,
    getQueryLog,
    getBilling
  ],
  triggers: [
    inboundWebhook,
    organizationChanges,
    roamingClientChanges,
    networkChanges,
    policyChanges
  ]
});
