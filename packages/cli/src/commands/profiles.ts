import { input } from '@inquirer/prompts';
import { createSlatesClientFromProfile, type openSlatesCliStore } from '@slates/profiles';
import path from 'path';
import { chooseProfile, openIntegrationStore, syncProfileMetadata } from '../lib/context';
import type { WithProfile } from '../lib/types';

let normalizeEntry = (rootDir: string, entry: string) => {
  let absolute = path.isAbsolute(entry) ? entry : path.resolve(process.cwd(), entry);
  let relative = path.relative(rootDir, absolute);
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative)
    ? relative
    : absolute;
};

let getNextSetupProfileName = async (
  store: Awaited<ReturnType<typeof openSlatesCliStore>>
) => {
  let names = new Set(store.listProfiles().map(profile => profile.name));
  if (!names.has('default')) {
    return 'default';
  }

  let suffix = 2;
  while (names.has(`default-${suffix}`)) {
    suffix += 1;
  }

  return `default-${suffix}`;
};

let createProfile = async (
  opts: WithProfile & {
    name?: string;
    entry?: string;
    exportName?: string;
    useAsDefault?: boolean;
    initializeConfig?: boolean;
    interactive?: boolean;
  }
) => {
  let { integration, store } = await openIntegrationStore(opts.integration);
  let interactive = opts.interactive ?? true;

  let defaultName =
    opts.name ??
    (opts.initializeConfig
      ? await getNextSetupProfileName(store)
      : `profile-${store.listProfiles().length + 1}`);
  let name =
    opts.name ??
    (interactive
      ? await input({ message: 'Profile name', default: defaultName })
      : defaultName);
  let defaultEntry = opts.entry ?? integration.entry;
  let entry =
    opts.entry ??
    (interactive
      ? await input({
          message: 'Local slate entry file',
          default: defaultEntry
        })
      : defaultEntry);
  let exportName =
    opts.exportName ??
    (interactive
      ? await input({ message: 'Export name (optional)', default: 'provider' })
      : 'provider');

  let profile = store.upsertProfile({
    name,
    target: {
      type: 'local',
      entry: normalizeEntry(store.rootDir, entry),
      exportName: exportName.trim() ? exportName.trim() : undefined
    }
  });

  let client = await createSlatesClientFromProfile(profile);
  await syncProfileMetadata({ store, profile, client });

  if (opts.initializeConfig) {
    let defaultConfig = (await client.getDefaultConfig()).config ?? {};
    let result = await client.updateConfig(null, defaultConfig);
    store.setProfileConfig(profile.id, result.config ?? defaultConfig);
  }

  if (opts.useAsDefault ?? store.listProfiles().length === 1) {
    store.setCurrentProfile(profile.id);
  }

  await store.save();

  return profile;
};

export let addProfile = async (
  opts: WithProfile & {
    name?: string;
    entry?: string;
    exportName?: string;
    useAsDefault?: boolean;
  }
) =>
  createProfile({
    ...opts,
    interactive: true
  });

export let setupIntegration = async (
  opts: WithProfile & {
    name?: string;
    exportName?: string;
  }
) =>
  createProfile({
    ...opts,
    useAsDefault: true,
    initializeConfig: true,
    interactive: false
  });

export let listProfiles = async (opts: Pick<WithProfile, 'integration'>) => {
  let { store } = await openIntegrationStore(opts.integration);
  let current = store.getProfile();
  return store.listProfiles().map(profile => ({
    name: profile.name,
    id: profile.id,
    current: profile.id === current?.id,
    entry: profile.target.type === 'local' ? profile.target.entry : null,
    authMethods: Object.keys(profile.auth)
  }));
};

export let getProfile = async (opts: WithProfile) => {
  let { store } = await openIntegrationStore(opts.integration);
  return store.requireProfile(opts.profile);
};

export let useProfile = async (opts: WithProfile) => {
  let { store, profile } = await chooseProfile(opts);
  store.setCurrentProfile(profile.id);
  await store.save();
  return profile;
};

export let removeProfile = async (opts: WithProfile) => {
  let { store, profile } = await chooseProfile(opts);
  store.removeProfile(profile.id);
  await store.save();
  return profile;
};
