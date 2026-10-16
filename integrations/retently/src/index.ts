import { Slate } from 'slates';
import { spec } from './spec';
import {
  annotateFeedback,
  getAccountStatus,
  getCampaigns,
  getCompanies,
  getCustomers,
  getFeedback,
  getOutbox,
  getReports,
  getScore,
  getTemplates,
  getTrends,
  importFeedback,
  manageCustomers,
  manageSuppressions,
  resubscribeCustomers,
  sendSurvey,
  syncCustomerAttributes,
  unsubscribeCustomers
} from './tools';

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
    unsubscribeCustomers,
    getAccountStatus,
    getTemplates,
    resubscribeCustomers,
    syncCustomerAttributes,
    importFeedback
  ],
  triggers: []
});
