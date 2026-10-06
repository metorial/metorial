import { Slate } from 'slates';
import { spec } from './spec';
import {
  createForm,
  deleteForm,
  deleteIntegration,
  getForm,
  getIntegration,
  getProfile,
  listForms,
  listIntegrations,
  listSubmissions,
  listUsers,
  updateForm
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getProfile,
    listForms,
    getForm,
    createForm,
    updateForm,
    deleteForm,
    listSubmissions,
    listIntegrations,
    getIntegration,
    deleteIntegration,
    listUsers
  ],
  triggers: []
});
