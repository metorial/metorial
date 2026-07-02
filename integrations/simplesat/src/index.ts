import { Slate } from 'slates';
import { spec } from './spec';
import {
  getAnswers,
  getResponses,
  getTeamMember,
  listQuestions,
  listSurveys,
  listTeamMembers,
  sendSurveyEmail,
  upsertCustomer
} from './tools';
import { inboundWebhook, newFeedback } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listSurveys,
    listQuestions,
    getAnswers,
    getResponses,
    upsertCustomer,
    sendSurveyEmail,
    getTeamMember,
    listTeamMembers
  ],
  triggers: [inboundWebhook, newFeedback]
});
