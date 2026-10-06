import { Slate } from 'slates';
import { spec } from './spec';
import {
  createClientAccount,
  createProspect,
  createShortLink,
  deleteProspect,
  enrichData,
  getProspect,
  listImpressions,
  listProspects,
  listTemplates,
  updateProspect
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listTemplates,
    createProspect,
    updateProspect,
    deleteProspect,
    getProspect,
    listProspects,
    createShortLink,
    enrichData,
    listImpressions,
    createClientAccount
  ],
  triggers: []
});
