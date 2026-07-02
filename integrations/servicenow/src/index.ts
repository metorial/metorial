import { Slate } from 'slates';
import { spec } from './spec';
import {
  browseServiceCatalog,
  createRecord,
  deleteRecord,
  getRecord,
  importData,
  manageAttachment,
  manageChangeRequest,
  manageCmdbCi,
  manageGroupMembership,
  manageIncident,
  manageKnowledgeArticle,
  manageProblem,
  manageUser,
  queryRecords,
  updateRecord
} from './tools';
import { inboundWebhook, incidentUpdates, recordChanges } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    queryRecords,
    getRecord,
    createRecord,
    updateRecord,
    deleteRecord,
    manageIncident,
    manageChangeRequest,
    manageProblem,
    manageCmdbCi,
    manageUser,
    manageGroupMembership,
    manageKnowledgeArticle,
    browseServiceCatalog,
    manageAttachment,
    importData
  ],
  triggers: [inboundWebhook, recordChanges, incidentUpdates]
});
