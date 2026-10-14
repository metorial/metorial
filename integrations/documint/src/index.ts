import { Slate } from 'slates';
import { spec } from './spec';
import {
  createDocument,
  deleteTemplate,
  getTemplate,
  listTemplates,
  updateTemplate
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [listTemplates, createDocument, getTemplate, updateTemplate, deleteTemplate],
  triggers: []
});
