import { execFileSync } from 'child_process';
import { randomUUID } from 'crypto';
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import type {
  SlatesCliStoreData,
  SlatesCliStoreScope,
  SlatesOAuthCredentialRecord,
  SlatesProfileRecord,
  SlatesProfileTarget,
  SlatesStoredAuth
} from './types';

type SlatesLegacyCliStoreData = {
  version?: number;
  currentProfileId: string | null;
  profiles: Record<string, SlatesProfileRecord>;
};

let STORE_VERSION = 3 as const;
let CLI_DIR_NAME = '.slates-cli';
let PROFILES_DIR_NAME = 'profiles';
let STORE_FILE_NAME = 'store.json';
let GITIGNORE_FILE_NAME = '.gitignore';

let createEmptyStore = (): SlatesCliStoreData => ({
  version: STORE_VERSION,
  currentProfileId: null,
  profiles: {},
  oauthCredentials: {}
});

let now = () => new Date().toISOString();

let ensureDir = async (dirPath: string) => {
  await mkdir(dirPath, { recursive: true });
};

let ensureGitIgnore = async (dirPath: string) => {
  let filePath = path.join(dirPath, GITIGNORE_FILE_NAME);
  await writeFile(filePath, '*\n!.gitignore\n', { encoding: 'utf-8' }).catch(async error => {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') return;
    throw error;
  });
};

export let resolveSlatesCliRoot = (cwd: string = process.cwd()) => {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], {
      cwd,
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf-8'
    }).trim();
  } catch {
    return cwd;
  }
};

let resolveSlatesCliDirFromRoot = (rootDir: string) => path.join(rootDir, CLI_DIR_NAME);

let resolveSlatesCliProfilesDirFromRoot = (rootDir: string) =>
  path.join(resolveSlatesCliDirFromRoot(rootDir), PROFILES_DIR_NAME);

export let resolveSlatesCliDir = (cwd: string = process.cwd()) =>
  resolveSlatesCliDirFromRoot(resolveSlatesCliRoot(cwd));

export let resolveSlatesCliProfilesDir = (cwd: string = process.cwd()) =>
  resolveSlatesCliProfilesDirFromRoot(resolveSlatesCliRoot(cwd));

let normalizeScopeKey = (scopeKey: string) =>
  path.posix.normalize(scopeKey.replace(/\\/g, '/')).replace(/^\.?\//, '');

let splitScopeKey = (scopeKey: string) =>
  normalizeScopeKey(scopeKey)
    .split('/')
    .filter(Boolean)
    .filter(segment => segment !== '.' && segment !== '..');

let resolveScopedStoreDir = (rootDir: string, scopeKey: string) =>
  path.join(resolveSlatesCliProfilesDirFromRoot(rootDir), ...splitScopeKey(scopeKey));

let resolveScopedStorePath = (rootDir: string, scopeKey: string) =>
  path.join(resolveScopedStoreDir(rootDir, scopeKey), STORE_FILE_NAME);

let inferRootDirFromStorePath = (storePath: string) => {
  let normalized = path.resolve(storePath);
  let parts = normalized.split(path.sep).filter(Boolean);
  let cliDirIndex = parts.lastIndexOf(CLI_DIR_NAME);

  if (cliDirIndex === -1) {
    throw new Error(`Could not infer Slates CLI root from store path: ${storePath}`);
  }

  let rootParts = parts.slice(0, cliDirIndex);
  return path.join(path.sep, ...rootParts);
};

let resolveScopeKeyFromStorePath = (rootDir: string, storePath: string) => {
  let profilesDir = resolveSlatesCliProfilesDirFromRoot(rootDir);
  let relativeDir = path.relative(profilesDir, path.dirname(storePath));
  if (!relativeDir || relativeDir.startsWith('..') || path.isAbsolute(relativeDir)) {
    return null;
  }

  return normalizeScopeKey(relativeDir);
};

let readStoreData = async <
  T extends { currentProfileId: string | null; profiles: Record<string, any> }
>(
  storePath: string
): Promise<T | null> => {
  try {
    let raw = await readFile(storePath, 'utf-8');
    if (!raw.trim()) {
      return null;
    }

    return JSON.parse(raw) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }

    throw error;
  }
};

let isProfileInScope = (rootDir: string, scopeKey: string, profile: SlatesProfileRecord) => {
  if (profile.target.type !== 'local') {
    return false;
  }

  let scopeDir = path.resolve(rootDir, ...splitScopeKey(scopeKey));
  let entryPath = path.isAbsolute(profile.target.entry)
    ? profile.target.entry
    : path.resolve(rootDir, profile.target.entry);
  let relative = path.relative(scopeDir, entryPath);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
};

let loadMigratedLegacyStore = async (
  rootDir: string,
  scopeKey: string
): Promise<SlatesCliStoreData> => {
  let legacyStorePath = path.join(resolveSlatesCliDirFromRoot(rootDir), STORE_FILE_NAME);
  let legacy = await readStoreData<SlatesLegacyCliStoreData>(legacyStorePath);
  if (!legacy) {
    return createEmptyStore();
  }

  let profiles = Object.fromEntries(
    Object.entries(legacy.profiles ?? {}).filter(([, profile]) =>
      isProfileInScope(rootDir, scopeKey, profile)
    )
  );

  let currentProfileId =
    legacy.currentProfileId && profiles[legacy.currentProfileId]
      ? legacy.currentProfileId
      : null;

  return {
    version: STORE_VERSION,
    currentProfileId,
    profiles,
    oauthCredentials: {}
  };
};

export class SlatesCliStore {
  constructor(
    readonly rootDir: string,
    readonly cliDir: string,
    readonly dirPath: string,
    readonly storePath: string,
    readonly scope: SlatesCliStoreScope | null,
    readonly data: SlatesCliStoreData
  ) {}

  static async open(
    opts: {
      cwd?: string;
      rootDir?: string;
      scope?: SlatesCliStoreScope;
      storePath?: string;
    } = {}
  ) {
    let storageRootDir = opts.storePath
      ? inferRootDirFromStorePath(opts.storePath)
      : resolveSlatesCliRoot(opts.cwd);
    let rootDir = opts.rootDir ?? storageRootDir;
    let cliDir = resolveSlatesCliDirFromRoot(storageRootDir);
    let scopeKey = opts.storePath
      ? resolveScopeKeyFromStorePath(storageRootDir, opts.storePath)
      : opts.scope?.key
        ? normalizeScopeKey(opts.scope.key)
        : null;
    let dirPath = opts.storePath
      ? path.dirname(opts.storePath)
      : scopeKey
        ? resolveScopedStoreDir(rootDir, scopeKey)
        : cliDir;
    let storePath =
      opts.storePath ??
      (scopeKey
        ? resolveScopedStorePath(rootDir, scopeKey)
        : path.join(cliDir, STORE_FILE_NAME));

    await ensureDir(cliDir);
    await ensureGitIgnore(cliDir);
    await ensureDir(dirPath);

    let parsed = await readStoreData<SlatesCliStoreData>(storePath);
    let data = parsed
      ? {
          version: STORE_VERSION,
          currentProfileId: parsed.currentProfileId ?? null,
          profiles: parsed.profiles ?? {},
          oauthCredentials: parsed.oauthCredentials ?? {}
        }
      : opts.storePath
        ? createEmptyStore()
        : scopeKey
          ? await loadMigratedLegacyStore(rootDir, scopeKey)
          : createEmptyStore();

    if (!parsed) {
      await writeFile(storePath, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
    }

    return new SlatesCliStore(
      rootDir,
      cliDir,
      dirPath,
      storePath,
      scopeKey ? { key: scopeKey, name: opts.scope?.name } : null,
      data
    );
  }

  async save() {
    await ensureDir(this.dirPath);
    await ensureDir(this.cliDir);
    await ensureGitIgnore(this.cliDir);
    await writeFile(this.storePath, `${JSON.stringify(this.data, null, 2)}\n`, 'utf-8');
  }

  listProfiles() {
    return Object.values(this.data.profiles).sort((a, b) => a.name.localeCompare(b.name));
  }

  listOAuthCredentials(authMethodId?: string) {
    return Object.values(this.data.oauthCredentials)
      .filter(credential => !authMethodId || credential.authMethodId === authMethodId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  getOAuthCredential(credentialId?: string | null, authMethodId?: string | null) {
    if (credentialId) {
      let direct = this.data.oauthCredentials[credentialId];
      if (direct && (!authMethodId || direct.authMethodId === authMethodId)) {
        return direct;
      }

      let matches = this.listOAuthCredentials(authMethodId ?? undefined).filter(
        credential => credential.name === credentialId
      );
      if (matches.length === 1) {
        return matches[0]!;
      }
    }

    return this.listOAuthCredentials(authMethodId ?? undefined)[0] ?? null;
  }

  getProfile(profileId?: string | null) {
    if (profileId) {
      if (this.data.profiles[profileId]) {
        return this.data.profiles[profileId] ?? null;
      }

      let matches = this.listProfiles().filter(profile => profile.name === profileId);
      if (matches.length === 1) {
        return matches[0]!;
      }
    }

    if (this.data.currentProfileId && this.data.profiles[this.data.currentProfileId]) {
      return this.data.profiles[this.data.currentProfileId]!;
    }

    return this.listProfiles()[0] ?? null;
  }

  requireProfile(profileId?: string | null) {
    let profile = this.getProfile(profileId);
    if (!profile) {
      throw new Error('No Slates profile found for this integration.');
    }

    return profile;
  }

  upsertProfile(d: {
    profileId?: string;
    name: string;
    target: SlatesProfileTarget;
    config?: SlatesProfileRecord['config'];
    session?: SlatesProfileRecord['session'];
    metadata?: SlatesProfileRecord['metadata'];
  }) {
    let existing = d.profileId ? this.data.profiles[d.profileId] : undefined;
    let id = existing?.id ?? d.profileId ?? randomUUID();
    let createdAt = existing?.createdAt ?? now();

    let profile: SlatesProfileRecord = {
      id,
      name: d.name,
      target: d.target,
      config: d.config ?? existing?.config ?? null,
      auth: existing?.auth ?? {},
      session: d.session ?? existing?.session ?? null,
      metadata: {
        provider: d.metadata?.provider ?? existing?.metadata?.provider ?? null,
        actions: d.metadata?.actions ?? existing?.metadata?.actions ?? null
      },
      createdAt,
      updatedAt: now()
    };

    this.data.profiles[id] = profile;
    if (!this.data.currentProfileId) {
      this.data.currentProfileId = id;
    }

    return profile;
  }

  upsertOAuthCredential(d: {
    credentialId?: string;
    name: string;
    authMethodId: string;
    clientId: string;
    clientSecret: string;
  }) {
    let existing = d.credentialId ? this.data.oauthCredentials[d.credentialId] : undefined;
    let id = existing?.id ?? d.credentialId ?? randomUUID();
    let credential: SlatesOAuthCredentialRecord = {
      id,
      name: d.name,
      authMethodId: d.authMethodId,
      clientId: d.clientId,
      clientSecret: d.clientSecret,
      createdAt: existing?.createdAt ?? now(),
      updatedAt: now()
    };

    this.data.oauthCredentials[id] = credential;
    return credential;
  }

  setCurrentProfile(profileId: string) {
    if (!this.data.profiles[profileId]) {
      throw new Error(`Unknown profile: ${profileId}`);
    }

    this.data.currentProfileId = profileId;
  }

  removeProfile(profileId: string) {
    delete this.data.profiles[profileId];

    if (this.data.currentProfileId === profileId) {
      this.data.currentProfileId = this.listProfiles()[0]?.id ?? null;
    }
  }

  setProfileConfig(profileId: string, config: SlatesProfileRecord['config']) {
    let profile = this.requireProfile(profileId);
    profile.config = config;
    profile.updatedAt = now();
    return profile;
  }

  setProfileSession(profileId: string, session: SlatesProfileRecord['session']) {
    let profile = this.requireProfile(profileId);
    profile.session = session;
    profile.updatedAt = now();
    return profile;
  }

  setProfileMetadata(profileId: string, metadata: Partial<SlatesProfileRecord['metadata']>) {
    let profile = this.requireProfile(profileId);
    profile.metadata = {
      provider: metadata.provider ?? profile.metadata.provider ?? null,
      actions: metadata.actions ?? profile.metadata.actions ?? null
    };
    profile.updatedAt = now();
    return profile;
  }

  upsertAuth(
    profileId: string,
    auth: Omit<SlatesStoredAuth, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ) {
    let profile = this.requireProfile(profileId);
    let existing = profile.auth[auth.authMethodId];

    profile.auth[auth.authMethodId] = {
      ...auth,
      id: auth.id ?? existing?.id ?? randomUUID(),
      createdAt: existing?.createdAt ?? now(),
      updatedAt: now()
    };
    profile.updatedAt = now();

    return profile.auth[auth.authMethodId]!;
  }

  getAuth(profileId: string, authMethodId?: string | null) {
    let profile = this.requireProfile(profileId);
    if (authMethodId) return profile.auth[authMethodId] ?? null;
    return Object.values(profile.auth)[0] ?? null;
  }

  listAuth(profileId: string) {
    let profile = this.requireProfile(profileId);
    return Object.values(profile.auth).sort((a, b) =>
      a.authMethodId.localeCompare(b.authMethodId)
    );
  }
}

export let openSlatesCliStore = async (
  opts: {
    cwd?: string;
    rootDir?: string;
    scope?: SlatesCliStoreScope;
    storePath?: string;
  } = {}
) => SlatesCliStore.open(opts);
