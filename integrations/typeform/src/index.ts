import { Slate } from '@slates/provider';
import { spec } from './spec';
import {
  createForm,
  deleteForm,
  deleteResponses,
  downloadResponseFile,
  getForm,
  getFormInsights,
  getResponses,
  listForms,
  listThemes,
  listWorkspaces,
  manageFormMessages,
  manageImage,
  manageTheme,
  manageTranslation,
  manageWebhook,
  manageWorkspace,
  patchForm,
  updateForm
} from './tools';
import { formResponse } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listForms,
    getForm,
    createForm,
    updateForm,
    patchForm,
    deleteForm,
    getResponses,
    downloadResponseFile,
    deleteResponses,
    listWorkspaces,
    manageWorkspace,
    listThemes,
    manageTheme,
    manageImage,
    manageWebhook,
    manageFormMessages,
    manageTranslation,
    getFormInsights
  ],
  triggers: [formResponse]
});
