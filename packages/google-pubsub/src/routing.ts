import type { SlateGooglePubSubProduct } from 'slates';
import type { PubSubMessage } from './types';

export type GooglePubSubProduct = SlateGooglePubSubProduct;

const WORKSPACE_EVENTS_SOURCE = '//workspaceevents.googleapis.com/';

export let googlePubSubRoutingKey = {
  gmail: (emailAddress: string) => `gmail:${emailAddress.trim().toLowerCase()}`,
  forms: (formId: string) => `forms:${formId}`,
  meet: (subscriptionName: string) => `meet:${subscriptionName}`,
  storage: (bucketName: string, notificationId: string) =>
    `storage:projects/_/buckets/${bucketName}/notificationConfigs/${notificationId}`
};

let text = (value: unknown) => (typeof value === 'string' && value.trim() ? value : undefined);

/** Registrations a shared-subscription push addresses; keys match `googlePubSubRoutingKey`. */
export let extractGooglePubSubRoutingKeys = (
  product: GooglePubSubProduct,
  message: Pick<PubSubMessage, 'data' | 'attributes'>
): string[] => {
  if (product === 'gmail') {
    let emailAddress =
      typeof message.data === 'object' && message.data !== null
        ? text((message.data as Record<string, unknown>).emailAddress)
        : undefined;
    return emailAddress ? [googlePubSubRoutingKey.gmail(emailAddress)] : [];
  }

  if (product === 'forms') {
    let formId = text(message.attributes.formId);
    return formId ? [googlePubSubRoutingKey.forms(formId)] : [];
  }

  if (product === 'meet') {
    let source = text(message.attributes['ce-source']);
    return source?.startsWith(WORKSPACE_EVENTS_SOURCE)
      ? [googlePubSubRoutingKey.meet(source.slice(WORKSPACE_EVENTS_SOURCE.length))]
      : [];
  }

  let notificationConfig = text(message.attributes.notificationConfig);
  return notificationConfig ? [`storage:${notificationConfig}`] : [];
};
