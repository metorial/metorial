import { Slate } from 'slates';
import { spec } from './spec';
import {
  deleteError,
  getError,
  getErrorTrends,
  getEvent,
  getOrganization,
  getPivots,
  getProject,
  getStability,
  listErrors,
  listEventFields,
  listEvents,
  listOrganizations,
  listProjects,
  listReleases,
  manageCollaborators,
  manageComments,
  manageProject,
  manageSavedSearches,
  updateError
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getOrganization,
    listEventFields,
    deleteError,
    listOrganizations,
    listProjects,
    getProject,
    manageProject,
    listErrors,
    getError,
    updateError,
    listEvents,
    getEvent,
    getErrorTrends,
    listReleases,
    manageCollaborators,
    manageComments,
    getStability,
    getPivots,
    manageSavedSearches
  ],
  triggers: []
});
