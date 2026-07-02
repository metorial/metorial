import { select } from '@inquirer/prompts';
import type { SlatesProtocolClient } from '@slates/client';
import {
  createSlatesClientFromProfile,
  openSlatesCliStore,
  type SlatesCliStore,
  type SlatesProfileRecord
} from '@slates/profiles';
import { resolveIntegration } from './integration';
import { promptForObjectSchema } from './prompts';

export let openIntegrationStore = async (integration: string) => {
  let resolved = await resolveIntegration(integration);
  let store = await openSlatesCliStore({
    cwd: resolved.rootDir,
    scope: {
      key: resolved.relativeDir,
      name: resolved.name
    }
  });

  return {
    integration: resolved,
    store
  };
};

export let chooseProfile = async (d: {
  integration: string;
  profile?: string;
  message?: string;
}) => {
  let { integration, store } = await openIntegrationStore(d.integration);
  if (d.profile) {
    return {
      integration,
      store,
      profile: store.requireProfile(d.profile)
    };
  }

  let profiles = store.listProfiles();
  if (profiles.length === 0) {
    throw new Error(
      `No Slates profiles found for ${integration.name}. Create one with \`slates ${d.integration} setup\`.`
    );
  }

  let current = store.getProfile();
  if (profiles.length === 1) {
    return {
      integration,
      store,
      profile: profiles[0]!
    };
  }

  let profileId = await select({
    message: d.message ?? 'Choose a profile',
    default: current?.id,
    choices: profiles.map(profile => ({
      name: `${profile.name} (${profile.id})`,
      value: profile.id
    }))
  });

  return {
    integration,
    store,
    profile: store.requireProfile(profileId)
  };
};

export let createClientContext = async (opts: {
  integration: string;
  profile?: string;
  autoRefresh?: boolean;
}) => {
  let { integration, store, profile } = await chooseProfile(opts);
  let client = await createSlatesClientFromProfile(profile, {
    store,
    autoRefresh: opts.autoRefresh
  });
  return { integration, store, profile, client };
};

export let createIntegrationClientContext = async (opts: { integration: string }) => {
  let { integration, store } = await openIntegrationStore(opts.integration);
  let client = await createSlatesClientFromProfile(
    {
      id: `integration-${integration.name}`,
      name: integration.name,
      target: {
        type: 'local',
        entry: integration.entry,
        exportName: 'provider'
      },
      config: null,
      auth: {},
      session: null,
      metadata: {
        provider: null,
        actions: null
      },
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString()
    },
    { store }
  );

  return { integration, store, client };
};

export let syncProfileMetadata = async (d: {
  store: SlatesCliStore;
  profile: SlatesProfileRecord;
  client: SlatesProtocolClient;
}) => {
  let [provider, actions] = await Promise.all([d.client.identify(), d.client.listActions()]);
  d.store.setProfileMetadata(d.profile.id, {
    provider: provider.provider,
    actions: actions.actions
  });
  await d.store.save();
};

export let ensureProfileConfig = async (d: {
  store: SlatesCliStore;
  profile: SlatesProfileRecord;
  client: SlatesProtocolClient;
}) => {
  if (d.profile.config) {
    d.client.setConfig(d.profile.config);
    return d.profile.config;
  }

  let defaultConfig = (await d.client.getDefaultConfig()).config ?? {};
  let schema = (await d.client.getConfigSchema()).schema;
  let config = await promptForObjectSchema(schema, defaultConfig);
  d.store.setProfileConfig(d.profile.id, config);
  await d.store.save();
  d.client.setConfig(config);
  return config;
};

export let chooseTool = async (d: { client: SlatesProtocolClient; toolId?: string }) => {
  if (d.toolId) {
    return d.client.getTool(d.toolId);
  }

  let tools = await d.client.listTools();
  if (tools.length === 0) {
    throw new Error('This slate does not expose any tools.');
  }

  let toolId = await select({
    message: 'Choose a tool',
    choices: tools.map(tool => ({
      name: `${tool.name} (${tool.id})`,
      value: tool.id
    }))
  });

  return d.client.getTool(toolId);
};

export let chooseAuthMethod = async (d: {
  client: SlatesProtocolClient;
  authMethodId?: string;
  forcePrompt?: boolean;
}) => {
  let methods = (await d.client.listAuthMethods()).authenticationMethods;
  if (methods.length === 0) {
    throw new Error('This slate does not expose any authentication methods.');
  }

  if (d.authMethodId) {
    let method = methods.find(item => item.id === d.authMethodId);
    if (!method) {
      throw new Error(`Unknown auth method: ${d.authMethodId}`);
    }

    return method;
  }

  if (methods.length === 1 && !d.forcePrompt) {
    return methods[0]!;
  }

  let methodId = await select({
    message: 'Choose an authentication method',
    choices: methods.map(method => ({
      name: `${method.name} (${method.type})`,
      value: method.id
    }))
  });

  return methods.find(method => method.id === methodId)!;
};
