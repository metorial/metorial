import { Slate } from 'slates';
import { spec } from './spec';
import {
  createPurchase,
  getAccount,
  getAccountInsights,
  listEmailTemplates,
  listSegments,
  listSubscribers,
  manageBroadcasts,
  manageCustomFields,
  manageForms,
  managePosts,
  managePurchases,
  manageSequenceEmails,
  manageSequences,
  manageSnippets,
  manageSubscriber,
  manageTags
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getAccount.build(),
    listSubscribers.build(),
    manageSubscriber.build(),
    manageTags.build(),
    manageForms.build(),
    manageSequences.build(),
    manageBroadcasts.build(),
    manageCustomFields.build(),
    createPurchase.build(),
    managePurchases.build(),
    getAccountInsights.build(),
    listSegments.build(),
    listEmailTemplates.build(),
    managePosts.build(),
    manageSnippets.build(),
    manageSequenceEmails.build()
  ],
  triggers: []
});
