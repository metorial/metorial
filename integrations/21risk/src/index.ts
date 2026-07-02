import { Slate } from 'slates';
import { spec } from './spec';
import {
  getAudit,
  getComplianceData,
  getCopeData,
  listAudits,
  listCategories,
  listCorrectiveActions,
  listMembers,
  listOrganizations,
  listPropertyInsuranceItems,
  listRiskModels,
  listSites
} from './tools';
import {
  inboundWebhook,
  newAuditTrigger,
  newCorrectiveActionTrigger,
  newMemberTrigger
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listOrganizations,
    listSites,
    listAudits,
    getAudit,
    listRiskModels,
    listCategories,
    listCorrectiveActions,
    getComplianceData,
    listMembers,
    listPropertyInsuranceItems,
    getCopeData
  ],
  triggers: [inboundWebhook, newAuditTrigger, newCorrectiveActionTrigger, newMemberTrigger]
});
