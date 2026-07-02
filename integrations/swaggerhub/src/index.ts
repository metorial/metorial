import { Slate } from 'slates';
import { spec } from './spec';
import {
  deleteApi,
  deleteDomain,
  getApiDefinition,
  getCollaboration,
  getComments,
  getDomainDefinition,
  manageIntegrations,
  manageProjects,
  runStandardization,
  saveApiDefinition,
  saveDomainDefinition,
  searchApisAndDomains,
  updateApiSettings
} from './tools';
import { apiVersionEvent } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    searchApisAndDomains,
    getApiDefinition,
    saveApiDefinition,
    deleteApi,
    updateApiSettings,
    getDomainDefinition,
    saveDomainDefinition,
    deleteDomain,
    getComments,
    manageIntegrations,
    manageProjects,
    runStandardization,
    getCollaboration
  ],
  triggers: [apiVersionEvent]
});
