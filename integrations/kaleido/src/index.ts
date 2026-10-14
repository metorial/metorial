import { Slate } from 'slates';
import { spec } from './spec';
import {
  getAuditLogs,
  getNodeStatus,
  listConsortia,
  listOrganizations,
  manageAppCredential,
  manageCompiledContract,
  manageConsortium,
  manageContractProject,
  manageEnvironment,
  manageInvitation,
  manageMembership,
  manageNode,
  manageService
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listConsortia,
    listOrganizations,
    manageConsortium,
    manageContractProject,
    manageEnvironment,
    manageNode,
    manageMembership,
    manageService,
    manageAppCredential,
    manageCompiledContract,
    getNodeStatus,
    getAuditLogs,
    manageInvitation
  ],
  triggers: []
});
