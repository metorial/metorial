import { Slate } from 'slates';
import { spec } from './spec';
import {
  createForm,
  createProject,
  createWebhook,
  deleteForm,
  deleteProject,
  deleteSubmission,
  deleteWebhook,
  getForm,
  getProject,
  getSubmission,
  getWebhook,
  listDomains,
  listForms,
  listProjects,
  listSubmissions,
  listWebhooks,
  refireWebhooks,
  updateForm,
  updateProject,
  updateSubmission,
  updateWebhook
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listForms,
    getForm,
    createForm,
    updateForm,
    deleteForm,
    listSubmissions,
    getSubmission,
    updateSubmission,
    deleteSubmission,
    refireWebhooks,
    listProjects,
    getProject,
    createProject,
    updateProject,
    deleteProject,
    listDomains,
    listWebhooks,
    getWebhook,
    createWebhook,
    updateWebhook,
    deleteWebhook
  ],
  triggers: []
});
