import { Slate } from 'slates';
import { spec } from './spec';
import {
  annotateFeedback,
  getCampaigns,
  getCompanies,
  getCustomers,
  getFeedback,
  getOutbox,
  getReports,
  getScore,
  getTrends,
  manageCustomers,
  manageSuppressions,
  sendSurvey,
  unsubscribeCustomers
} from './tools';
import { newFeedback, surveyWebhook } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    manageCustomers,
    getCustomers,
    sendSurvey,
    getFeedback,
    annotateFeedback,
    getScore,
    getCampaigns,
    getCompanies,
    getReports,
    getTrends,
    getOutbox,
    manageSuppressions,
    unsubscribeCustomers
  ],
  triggers: [surveyWebhook, newFeedback]
});
