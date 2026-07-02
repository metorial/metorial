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
  getSubmission,
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
import { inboundWebhook, newSubmission } from './triggers';

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
    createProject,
    updateProject,
    deleteProject,
    listDomains,
    listWebhooks,
    createWebhook,
    updateWebhook,
    deleteWebhook
  ],
  triggers: [inboundWebhook, newSubmission]
});
