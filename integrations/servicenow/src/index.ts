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
  manageGroupMembership,
  manageIncident,
  manageKnowledgeArticle,
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
    manageUser,
    manageGroupMembership,
    manageKnowledgeArticle,
    browseServiceCatalog,
    manageAttachment,
    importData
  ],
  triggers: [inboundWebhook, recordChanges, incidentUpdates]
});
