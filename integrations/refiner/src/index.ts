import { Slate } from 'slates';
import { spec } from './spec';
import {
  deleteContact,
  getAccount,
  getContact,
  getCurrentProject,
  getReporting,
  identifyUser,
  listContacts,
  listResponses,
  listSegments,
  listSurveyHistory,
  listSurveys,
  manageSegment,
  manageSurvey,
  storeResponse,
  tagResponse,
  trackEvent
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listContacts,
    getContact,
    deleteContact,
    identifyUser,
    trackEvent,
    listResponses,
    storeResponse,
    tagResponse,
    listSurveys,
    manageSurvey,
    listSegments,
    manageSegment,
    getReporting,
    getAccount,
    getCurrentProject,
    listSurveyHistory
  ],
  triggers: []
});
