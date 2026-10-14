import { Slate } from 'slates';
import { spec } from './spec';
import {
  getAnswers,
  getCustomer,
  getResponses,
  getTeamMember,
  listCustomers,
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
    listCustomers,
    getCustomer,
    upsertCustomer,
    sendSurveyEmail,
    getTeamMember,
    listTeamMembers
  ],
  triggers: []
});
