import { Slate } from 'slates';
import { spec } from './spec';
import {
  getCampaignAnalytics,
  getCurrentUser,
  getSubscriberImport,
  importSubscribers,
  listCampaigns,
  listEmailLists,
  listSubscribers,
  listTransactionalTemplates,
  manageCampaign,
  manageEmailList,
  manageSegment,
  manageSubscriber,
  manageSubscriberTags,
  manageSuppression,
  manageTag,
  manageTemplate,
  sendCampaign,
  sendTransactionalEmail
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getCurrentUser.build(),
    listEmailLists.build(),
    manageEmailList.build(),
    listSubscribers.build(),
    manageSubscriber.build(),
    manageSubscriberTags.build(),
    listCampaigns.build(),
    manageCampaign.build(),
    sendCampaign.build(),
    getCampaignAnalytics.build(),
    manageTemplate.build(),
    sendTransactionalEmail.build(),
    listTransactionalTemplates.build(),
    manageTag.build(),
    manageSegment.build(),
    manageSuppression.build(),
    importSubscribers.build(),
    getSubscriberImport.build()
  ],
  triggers: []
});
