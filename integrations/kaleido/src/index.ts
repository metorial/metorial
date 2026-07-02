import { Slate } from 'slates';
import { spec } from './spec';
import {
  getAuditLogs,
  getNodeStatus,
  listConsortia,
  manageAppCredential,
  manageCompiledContract,
  manageConsortium,
  manageEnvironment,
  manageInvitation,
  manageMembership,
  manageNode,
  manageService
} from './tools';
import { auditLogChanges, inboundWebhook } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listConsortia,
    manageConsortium,
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
  triggers: [inboundWebhook, auditLogChanges]
});
