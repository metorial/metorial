import { Slate } from 'slates';
import { spec } from './spec';
import {
  deleteContact,
  getAccount,
  getContact,
  getReporting,
  identifyUser,
  listContacts,
  listResponses,
  listSegments,
  listSurveys,
  manageSegment,
  manageSurvey,
  storeResponse,
  tagResponse,
  trackEvent
} from './tools';
import { segmentEntry, surveyInteraction, tagAdded } from './triggers';

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
    getAccount
  ],
  triggers: [surveyInteraction, segmentEntry, tagAdded]
});
