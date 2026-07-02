import { Slate } from 'slates';
import { spec } from './spec';
import {
  manageAudience,
  manageCmpAsset,
  manageCmpCampaign,
  manageCmpTask,
  manageCmsContent,
  manageCustomer,
  manageExperiment,
  manageFeatureFlag,
  manageMailing,
  manageProject,
  manageRecipientList,
  sendOdpEvent
} from './tools';
import {
  campaignEmailWebhook,
  cmpWebhook,
  experimentationWebhook,
  graphWebhook
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    manageProject,
    manageExperiment,
    manageAudience,
    manageFeatureFlag,
    manageCmpTask,
    manageCmpCampaign,
    manageCmpAsset,
    manageCmsContent,
    manageMailing,
    manageRecipientList,
    manageCustomer,
    sendOdpEvent
  ],
  triggers: [cmpWebhook, campaignEmailWebhook, experimentationWebhook, graphWebhook]
});
