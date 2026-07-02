import { Slate } from 'slates';
import { spec } from './spec';
import {
  configureAutoFeedback,
  createBusiness,
  createCustomer,
  createCustomersBulk,
  createUser,
  deleteBusiness,
  deleteCustomer,
  getBusiness,
  getFacebookRecommendations,
  getFeedbacks,
  getGoogleQA,
  getOnlineReviews,
  getReviewWidget,
  getSurveyResults,
  listBusinesses,
  listCustomers,
  replyToReview,
  searchBusiness,
  sendFeedbackRequest,
  updateBusiness,
  updateCustomer
} from './tools';
import { inboundWebhook, newFeedback, newOnlineReview } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listBusinesses,
    getBusiness,
    createBusiness,
    updateBusiness,
    deleteBusiness,
    searchBusiness,
    listCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    createCustomersBulk,
    sendFeedbackRequest,
    getFeedbacks,
    getOnlineReviews,
    replyToReview,
    getSurveyResults,
    getReviewWidget,
    getGoogleQA,
    getFacebookRecommendations,
    configureAutoFeedback,
    createUser
  ],
  triggers: [inboundWebhook, newFeedback, newOnlineReview]
});
