import {
  chooseTriggerAction,
  chooseTriggerGroup,
  createClientContext,
  ensureProfileConfig,
  syncProfileMetadata
} from '../lib/context';
import { parseJsonObject, promptForObjectSchema, promptForString } from '../lib/prompts';
import type { JsonInput, WithProfile } from '../lib/types';

export let listTriggers = async (opts: WithProfile) => {
  let { store, profile, client } = await createClientContext(opts);
  let triggers = await client.listTriggers();
  await syncProfileMetadata({ store, profile, client });
  return triggers.map(trigger => `${trigger.name} (${trigger.id})`);
};

export let getTrigger = async (opts: WithProfile & { triggerId?: string }) => {
  let { client } = await createClientContext(opts);
  return chooseTriggerAction({ client, triggerId: opts.triggerId });
};

export let mapTriggerEvent = async (
  opts: WithProfile & JsonInput & { triggerId?: string }
) => {
  let { store, profile, client } = await createClientContext(opts);
  let trigger = await chooseTriggerAction({ client, triggerId: opts.triggerId });

  await ensureProfileConfig({ store, profile, client });

  let input =
    parseJsonObject(opts.input, 'trigger event input') ??
    (await promptForObjectSchema(trigger.inputSchema, {}));

  let result = await client.mapTriggerEvent(trigger.id, input);
  store.setProfileSession(profile.id, client.state.session);
  await store.save();
  return result;
};

export let listTriggerGroups = async (opts: WithProfile) => {
  let { client } = await createClientContext(opts);
  let result = await client.listTriggerGroups();
  return result.triggerGroups.map(
    group => `${group.name} (${group.id}) [${group.invocation.type}]`
  );
};

export let getTriggerGroup = async (opts: WithProfile & { triggerGroupId?: string }) => {
  let { client } = await createClientContext(opts);
  return chooseTriggerGroup({ client, triggerGroupId: opts.triggerGroupId });
};

export let listTriggerGroupWebhookTargets = async (
  opts: WithProfile & { triggerGroupId?: string; pageToken?: string }
) => {
  let { store, profile, client } = await createClientContext(opts);
  let group = await chooseTriggerGroup({ client, triggerGroupId: opts.triggerGroupId });
  await ensureProfileConfig({ store, profile, client });

  return client.listTriggerGroupWebhookTargets({
    triggerGroupId: group.id,
    pageToken: opts.pageToken ? JSON.parse(opts.pageToken) : null
  });
};

export let registerTriggerGroupWebhook = async (
  opts: WithProfile & {
    triggerGroupId?: string;
    webhookTargetIdentifier?: string;
    webhookTargetPayload?: string;
    webhookUrl?: string;
  }
) => {
  let { store, profile, client } = await createClientContext(opts);
  let group = await chooseTriggerGroup({ client, triggerGroupId: opts.triggerGroupId });
  await ensureProfileConfig({ store, profile, client });

  let webhookTargetIdentifier =
    opts.webhookTargetIdentifier ??
    (await promptForString({ message: 'Webhook target identifier' }));
  let webhookUrl = opts.webhookUrl ?? (await promptForString({ message: 'Webhook URL' }));
  let webhookTargetPayload =
    parseJsonObject(opts.webhookTargetPayload, 'webhook target payload') ?? {};

  return client.registerTriggerGroupWebhook({
    triggerGroupId: group.id,
    webhookTargetIdentifier,
    webhookTargetPayload,
    webhookUrl
  });
};

export let unregisterTriggerGroupWebhook = async (
  opts: WithProfile & {
    triggerGroupId?: string;
    webhookRegistrationIdentifier: string;
    webhookRegistrationPayload?: string;
  }
) => {
  let { store, profile, client } = await createClientContext(opts);
  let group = await chooseTriggerGroup({ client, triggerGroupId: opts.triggerGroupId });
  await ensureProfileConfig({ store, profile, client });

  return client.unregisterTriggerGroupWebhook({
    triggerGroupId: group.id,
    webhookRegistrationIdentifier: opts.webhookRegistrationIdentifier,
    webhookRegistrationPayload:
      parseJsonObject(opts.webhookRegistrationPayload, 'webhook registration payload') ?? {}
  });
};

export let setupTriggerGroupWebhookManually = async (
  opts: WithProfile & { triggerGroupId?: string; webhookUrl?: string }
) => {
  let { client } = await createClientContext(opts);
  let group = await chooseTriggerGroup({ client, triggerGroupId: opts.triggerGroupId });
  let webhookUrl = opts.webhookUrl ?? (await promptForString({ message: 'Webhook URL' }));

  return client.setupTriggerGroupWebhookManually({
    triggerGroupId: group.id,
    webhookUrl
  });
};

export let finishTriggerGroupWebhookManualSetup = async (
  opts: WithProfile & {
    triggerGroupId?: string;
    webhookUrl?: string;
    partialWebhookRegistrationPayload?: string;
    userWebhookRegistrationPayload?: string;
  }
) => {
  let { client } = await createClientContext(opts);
  let group = await chooseTriggerGroup({ client, triggerGroupId: opts.triggerGroupId });
  let webhookUrl = opts.webhookUrl ?? (await promptForString({ message: 'Webhook URL' }));

  return client.finishTriggerGroupWebhookManualSetup({
    triggerGroupId: group.id,
    webhookUrl,
    partialWebhookRegistrationPayload:
      parseJsonObject(opts.partialWebhookRegistrationPayload, 'partial registration payload') ??
      {},
    userWebhookRegistrationPayload:
      parseJsonObject(opts.userWebhookRegistrationPayload, 'user registration payload') ?? {}
  });
};

export let processTriggerGroupWebhook = async (
  opts: WithProfile & {
    triggerGroupId?: string;
    url?: string;
    method?: string;
    headers?: string;
    body?: string;
    webhookRegistrationPayload?: string;
  }
) => {
  let { store, profile, client } = await createClientContext(opts);
  let group = await chooseTriggerGroup({ client, triggerGroupId: opts.triggerGroupId });
  await ensureProfileConfig({ store, profile, client });

  let url = opts.url ?? (await promptForString({ message: 'Request URL' }));

  return client.processTriggerGroupWebhook({
    triggerGroupId: group.id,
    url,
    method: opts.method ?? 'POST',
    headers: parseJsonObject(opts.headers, 'request headers') ?? undefined,
    body: opts.body ?? null,
    webhookRegistrationPayload:
      parseJsonObject(opts.webhookRegistrationPayload, 'webhook registration payload') ?? null
  });
};

export let getTriggerGroupRoutingMatchers = async (
  opts: WithProfile & { triggerGroupId?: string }
) => {
  let { store, profile, client } = await createClientContext(opts);
  let group = await chooseTriggerGroup({ client, triggerGroupId: opts.triggerGroupId });
  await ensureProfileConfig({ store, profile, client });

  return client.getTriggerGroupRoutingMatchers(group.id);
};

export let pollTriggerGroup = async (
  opts: WithProfile & { triggerGroupId?: string; state?: string }
) => {
  let { store, profile, client } = await createClientContext(opts);
  let group = await chooseTriggerGroup({ client, triggerGroupId: opts.triggerGroupId });
  await ensureProfileConfig({ store, profile, client });

  let result = await client.pollTriggerGroup({
    triggerGroupId: group.id,
    state: opts.state ? JSON.parse(opts.state) : null
  });

  store.setProfileSession(profile.id, client.state.session);
  await store.save();
  return result;
};
