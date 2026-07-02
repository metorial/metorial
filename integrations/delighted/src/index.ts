import { Slate } from 'slates';
import { spec } from './spec';
import {
  addSurveyResponse,
  addToAutopilot,
  cancelPendingSurveys,
  deletePerson,
  getAutopilotConfig,
  getMetrics,
  listAutopilotMembers,
  listPeople,
  listSurveyResponses,
  removeFromAutopilot,
  sendSurvey,
  unsubscribePerson
} from './tools';
import { surveyResponseTrigger, unsubscribeTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    sendSurvey,
    listSurveyResponses,
    addSurveyResponse,
    getMetrics,
    listPeople,
    deletePerson,
    unsubscribePerson,
    cancelPendingSurveys,
    getAutopilotConfig,
    addToAutopilot,
    listAutopilotMembers,
    removeFromAutopilot
  ],
  triggers: [surveyResponseTrigger, unsubscribeTrigger]
});
