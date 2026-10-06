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
  triggers: []
});
