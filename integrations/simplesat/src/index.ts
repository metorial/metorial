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
  triggers: []
});
