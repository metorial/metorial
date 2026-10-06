import { Slate } from 'slates';
import { spec } from './spec';
import {
  addNote,
  createSuggestion,
  deleteSuggestion,
  getSuggestion,
  importExternalUsers,
  listCategories,
  listComments,
  listFeatures,
  listForums,
  listLabels,
  listNpsRatings,
  listStatuses,
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
