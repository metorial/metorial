import { createClientContext } from '../lib/context';
import { parseJsonObject, promptForObjectSchema } from '../lib/prompts';
import type { JsonInput, WithProfile } from '../lib/types';

export let getConfig = async (opts: WithProfile) => {
  let { profile } = await createClientContext(opts);
  return profile.config;
};

export let getConfigSchema = async (opts: WithProfile) => {
  let { client } = await createClientContext(opts);
  return client.getConfigSchema();
};

export let setConfig = async (opts: WithProfile & JsonInput) => {
  let { store, profile, client } = await createClientContext(opts);
  let previousConfig = profile.config;
  let schema = (await client.getConfigSchema()).schema;
  let defaultConfig = (await client.getDefaultConfig()).config ?? {};
  let desiredConfig =
    parseJsonObject(opts.input, 'config input') ??
    (await promptForObjectSchema(schema, previousConfig ?? defaultConfig));
  let result = await client.updateConfig(previousConfig, desiredConfig);
  let finalConfig = result.config ?? desiredConfig;
  store.setProfileConfig(profile.id, finalConfig);
  await store.save();
  return {
    ...result,
    config: finalConfig
  };
};
