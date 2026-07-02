import { Slate } from 'slates';
import { spec } from './spec';
import {
  getAccount,
  getEmailAddressInsights,
  getMessageInsights,
  manageConfigurationSet,
  manageContact,
  manageContactList,
  manageDedicatedIpPool,
  manageEmailIdentity,
  manageEmailTemplate,
  manageEventDestination,
  manageSuppression,
  sendBulkEmail,
  sendEmail
} from './tools';
import { identityChanges, inboundWebhook, suppressionChanges } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    sendEmail,
    sendBulkEmail,
    manageEmailTemplate,
    manageContactList,
    manageContact,
    manageEmailIdentity,
    manageSuppression,
    getAccount,
    manageConfigurationSet,
    manageDedicatedIpPool,
    manageEventDestination,
    getEmailAddressInsights,
    getMessageInsights
  ],
  triggers: [inboundWebhook, suppressionChanges, identityChanges]
});
