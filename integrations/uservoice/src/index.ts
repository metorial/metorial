import { Slate } from 'slates';
import { spec } from './spec';
import {
  addNote,
  createSuggestion,
  deleteSuggestion,
  getCurrentUser,
  getSuggestion,
  importExternalUsers,
  listCategories,
  listComments,
  listFeatures,
  listForums,
  listLabels,
  listNotes,
  listNpsRatings,
  listStatuses,
  listStatusUpdates,
  listSuggestions,
  listSupporters,
  listUsers,
  manageForum,
  manageSupporter,
  updateSuggestion,
  updateSuggestionStatus
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getCurrentUser,
    listNotes,
    listStatusUpdates,
    listSuggestions,
    getSuggestion,
    createSuggestion,
    updateSuggestion,
    deleteSuggestion,
    updateSuggestionStatus,
    listForums,
    manageForum,
    listUsers,
    listSupporters,
    manageSupporter,
    listStatuses,
    listLabels,
    listCategories,
    listComments,
    listFeatures,
    listNpsRatings,
    addNote,
    importExternalUsers
  ],
  triggers: []
});
