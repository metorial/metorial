import { Slate } from 'slates';
import { spec } from './spec';
import {
  deleteSubscriber,
  getSubscriber,
  listAccounts,
  listBroadcasts,
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
import { subscriberActivity } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
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
  triggers: [subscriberActivity]
});
