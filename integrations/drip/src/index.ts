import { Slate } from 'slates';
import { spec } from './spec';
import {
  deleteSubscriber,
  getCurrentUser,
  getSubscriber,
  listAccounts,
  listBroadcasts,
  listCampaignSubscriptions,
  listConversions,
  listCustomFields,
  listEventActions,
  listForms,
  listSubscribers,
  manageCampaign,
  manageCart,
  manageOrder,
  manageProduct,
  manageSubscriber,
  manageTags,
  manageWorkflow,
  recordEvent,
  unsubscribe
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getCurrentUser,
    listCampaignSubscriptions,
    manageSubscriber,
    getSubscriber,
    listSubscribers,
    deleteSubscriber,
    unsubscribe,
    manageTags,
    manageCampaign,
    manageWorkflow,
    recordEvent,
    listEventActions,
    manageOrder,
    manageCart,
    manageProduct,
    listBroadcasts,
    listConversions,
    listCustomFields,
    listForms,
    listAccounts
  ],
  triggers: []
});
