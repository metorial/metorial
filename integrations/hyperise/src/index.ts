import { Slate } from 'slates';
import { spec } from './spec';
import {
  createClientAccount,
  createClientOrganization,
  createProspect,
  createShortLink,
  deleteProspect,
  enrichData,
  getCurrentUser,
  getProspect,
  listImpressions,
  listProspects,
  listTemplates,
  updateProspect
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getCurrentUser,
    listTemplates,
    createProspect,
    updateProspect,
    deleteProspect,
    getProspect,
    listProspects,
    createShortLink,
    enrichData,
    listImpressions,
    createClientAccount,
    createClientOrganization
  ],
  triggers: []
});
