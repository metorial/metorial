import { verifyHmacSignature } from 'slates';
import type { ClickUpClient } from './client';
import { clickupServiceError, isClickUpNotFoundError } from './errors';

export type ClickUpWebhookRegistrationDetails = {
  webhooks: Array<{
    workspaceId: string;
    webhookId: string;
    secret: string;
  }>;
};

type ClickUpWebhookClient = Pick<
  ClickUpClient,
  'createWebhook' | 'deleteWebhook' | 'getWorkspaces'
>;

let rollbackClickUpWebhooks = async (client: ClickUpWebhookClient, webhookIds: string[]) => {
  for (let webhookId of webhookIds) {
    try {
      await client.deleteWebhook(webhookId);
    } catch {
      // Preserve the registration error while still attempting every rollback.
    }
  }
};

export let registerClickUpWebhooks = async (input: {
  client: ClickUpWebhookClient;
  endpoint: string;
  events: string[];
}): Promise<ClickUpWebhookRegistrationDetails> => {
  let details: ClickUpWebhookRegistrationDetails = { webhooks: [] };
  let registeredWebhookIds: string[] = [];

  try {
    let workspaces = await input.client.getWorkspaces();
    if (workspaces.length === 0) {
      throw clickupServiceError('No ClickUp Workspaces are authorized for this connection.');
    }

    for (let workspace of workspaces) {
      let workspaceId = String(workspace?.id ?? '').trim();
      if (!workspaceId) {
        throw clickupServiceError('ClickUp returned an authorized Workspace without an ID.');
      }

      let result = await input.client.createWebhook(workspaceId, {
        endpoint: input.endpoint,
        events: input.events
      });
      let webhookId = String(result?.id ?? result?.webhook?.id ?? '').trim();

      if (!webhookId) {
        throw clickupServiceError(
          `ClickUp did not return a webhook ID for Workspace ${workspaceId}.`
        );
      }
      registeredWebhookIds.push(webhookId);

      let secret = String(result?.secret ?? result?.webhook?.secret ?? '').trim();
      if (!secret) {
        throw clickupServiceError(
          `ClickUp did not return a webhook secret for Workspace ${workspaceId}.`
        );
      }

      details.webhooks.push({ workspaceId, webhookId, secret });
    }

    return details;
  } catch (error) {
    await rollbackClickUpWebhooks(input.client, registeredWebhookIds);
    throw error;
  }
};

export let unregisterClickUpWebhooks = async (input: {
  client: Pick<ClickUpClient, 'deleteWebhook'>;
  details: ClickUpWebhookRegistrationDetails | null | undefined;
}) => {
  let firstError: unknown;

  for (let webhook of input.details?.webhooks ?? []) {
    try {
      await input.client.deleteWebhook(webhook.webhookId);
    } catch (error) {
      if (!isClickUpNotFoundError(error) && firstError === undefined) {
        firstError = error;
      }
    }
  }

  if (firstError !== undefined) {
    throw firstError;
  }
};

export let resolveClickUpWebhookRegistration = (
  details: ClickUpWebhookRegistrationDetails | null | undefined,
  webhookId: unknown
) => {
  let normalizedWebhookId = typeof webhookId === 'string' ? webhookId.trim() : '';

  if (!normalizedWebhookId) {
    throw clickupServiceError(
      'The ClickUp webhook is not part of this trigger registration because webhook_id is missing.'
    );
  }

  let registration = details?.webhooks.find(
    webhook => webhook.webhookId === normalizedWebhookId
  );
  if (!registration) {
    throw clickupServiceError(
      `ClickUp webhook ${normalizedWebhookId} is not part of this trigger registration.`
    );
  }

  return registration;
};

export let resolveClickUpWebhookWorkspaceId = (
  details: ClickUpWebhookRegistrationDetails | null | undefined,
  webhookId: unknown
) => resolveClickUpWebhookRegistration(details, webhookId).workspaceId;

export let verifyClickUpWebhookSignature = (input: {
  secret: unknown;
  payload: string;
  signature: string | null;
}) => {
  if (typeof input.secret !== 'string' || !input.secret || !input.signature) {
    return false;
  }

  return verifyHmacSignature({
    secret: input.secret,
    payload: input.payload,
    signature: input.signature.trim(),
    digest: 'hex'
  });
};
