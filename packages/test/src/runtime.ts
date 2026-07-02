import type { SlatesProtocolClientOptions } from '@slates/client';
import {
  createLocalSlateTransport,
  createSlatesClient,
  SlateProtocolError
} from '@slates/client';
import {
  createSlatesClientFromProfile,
  openSlatesCliStore,
  type SlatesProfileRecord
} from '@slates/profiles';
import { readFile } from 'fs/promises';

export interface SlatesRuntimeContext {
  integration: string | null;
  profileId: string | null;
  authMethodId: string | null;
  profile: SlatesProfileRecord | null;
  rootDir: string;
  storePath: string;
  cliDir: string;
}

export type SlatesTestClient = ReturnType<typeof createSlatesClient>;

type LocalSlate = Parameters<typeof createLocalSlateTransport>[0]['slate'];
interface LocalSlateLike {
  readonly spec: unknown;
  readonly actions: readonly unknown[];
}
type SlatesAction = Awaited<ReturnType<SlatesTestClient['listActions']>>['actions'][number];
type SlatesToolAction = Extract<SlatesAction, { type: 'action.tool' }>;
type SlatesTriggerAction = Extract<SlatesAction, { type: 'action.trigger' }>;
type SlateAuthenticationMethod = Awaited<
  ReturnType<SlatesTestClient['listAuthMethods']>
>['authenticationMethods'][number];

let selectProfileAuth = (profile: SlatesProfileRecord | null, authMethodId: string | null) => {
  if (!profile || !authMethodId) {
    return profile;
  }

  let selectedAuth = profile.auth[authMethodId];
  if (!selectedAuth) {
    let availableAuthMethods = Object.keys(profile.auth);
    throw new Error(
      `No stored authentication found for auth method "${authMethodId}" in profile "${profile.name}".` +
        (availableAuthMethods.length > 0
          ? ` Available auth methods: ${availableAuthMethods.join(', ')}.`
          : ' No auth methods are stored for this profile.')
    );
  }

  return {
    ...profile,
    auth: {
      [selectedAuth.authMethodId]: selectedAuth
    }
  };
};

export interface ExpectedSlateAction {
  id: string;
  name?: string;
  description?: string;
  readOnly?: boolean;
  destructive?: boolean;
  invocationType?: 'polling' | 'webhook';
}

export let getVitestExpect = () => {
  let maybeExpect = (
    globalThis as typeof globalThis & { expect?: typeof import('vitest').expect }
  ).expect;

  if (!maybeExpect) {
    throw new Error('Vitest expect is not available in the current runtime.');
  }

  return maybeExpect;
};

export let loadSlatesRuntimeContext = async (
  opts: { cwd?: string; profile?: string | null } = {}
): Promise<SlatesRuntimeContext> => {
  let runtimeContextPath = process.env.SLATES_TEST_CONTEXT_PATH;
  if (runtimeContextPath) {
    let raw = await readFile(runtimeContextPath, 'utf-8');
    let parsed = JSON.parse(raw) as {
      integration?: string | null;
      profileId: string | null;
      authMethodId?: string | null;
      rootDir?: string;
      storePath: string;
      cliDir: string;
    };
    let store = await openSlatesCliStore({
      storePath: parsed.storePath,
      rootDir: parsed.rootDir ?? process.env.SLATES_STORE_ROOT_DIR
    });
    let authMethodId = parsed.authMethodId ?? null;
    let profile = selectProfileAuth(
      store.getProfile(opts.profile ?? parsed.profileId ?? null),
      authMethodId
    );

    return {
      integration: parsed.integration ?? store.scope?.key ?? null,
      profileId: profile?.id ?? parsed.profileId ?? null,
      authMethodId,
      profile,
      rootDir: parsed.rootDir ?? store.rootDir,
      storePath: parsed.storePath,
      cliDir: parsed.cliDir
    };
  }

  let store = process.env.SLATES_STORE_PATH
    ? await openSlatesCliStore({
        storePath: process.env.SLATES_STORE_PATH,
        rootDir: process.env.SLATES_STORE_ROOT_DIR
      })
    : await openSlatesCliStore({ cwd: opts.cwd });
  let profileId = opts.profile ?? process.env.SLATES_PROFILE_ID ?? null;
  let authMethodId: any = null;
  let profile = selectProfileAuth(store.getProfile(profileId), authMethodId);

  return {
    integration: process.env.SLATES_INTEGRATION ?? store.scope?.key ?? null,
    profileId: profile?.id ?? null,
    authMethodId,
    profile,
    rootDir: store.rootDir,
    storePath: store.storePath,
    cliDir: store.dirPath
  };
};

export let loadSlatesProfile = async (
  opts: { cwd?: string; profile?: string | null } = {}
) => {
  let context = await loadSlatesRuntimeContext(opts);
  if (!context.profile) {
    throw new Error('No Slates profile is available for the current test context.');
  }

  return context.profile;
};

export let createSlatesTestClient = async (
  opts: { cwd?: string; profile?: string | null } = {}
) => {
  let context = await loadSlatesRuntimeContext(opts);
  if (!context.profile) {
    throw new Error('No Slates profile is available for the current test context.');
  }

  let store = await openSlatesCliStore({
    storePath: context.storePath,
    rootDir: context.rootDir
  });
  return createSlatesClientFromProfile(context.profile, { cwd: opts.cwd, store });
};

export let withSlateProfile = async <T>(
  profileName: string | null | undefined,
  cb: (ctx: { profile: SlatesProfileRecord }) => Promise<T>
) => {
  let profile = await loadSlatesProfile({ profile: profileName });
  return cb({ profile });
};

export let expectToolCall = async (d: {
  client?: Awaited<ReturnType<typeof createSlatesTestClient>>;
  profile?: string | null;
  toolId: string;
  input: Record<string, any>;
  output?: Record<string, any>;
}) => {
  let expect = getVitestExpect();
  let client = d.client ?? (await createSlatesTestClient({ profile: d.profile }));
  let result = await client.invokeTool(d.toolId, d.input);

  if (d.output) {
    expect(result.output).toMatchObject(d.output);
  }

  return result;
};

export let createLocalSlateTestClient = (opts: {
  slate: LocalSlateLike;
  state?: SlatesProtocolClientOptions['state'];
  participants?: SlatesProtocolClientOptions['participants'];
}) =>
  createSlatesClient({
    transport: createLocalSlateTransport({ slate: opts.slate as LocalSlate }),
    state: opts.state,
    participants: opts.participants
  });

export let getSlateContract = async (client: SlatesTestClient) => {
  let [provider, actions, authMethods, configSchema] = await Promise.all([
    client.identify(),
    client.listActions(),
    client.listAuthMethods(),
    client.getConfigSchema()
  ]);

  return {
    provider: provider.provider,
    actions: actions.actions,
    tools: actions.actions.filter(
      (action: SlatesAction): action is SlatesToolAction => action.type === 'action.tool'
    ),
    triggers: actions.actions.filter(
      (action: SlatesAction): action is SlatesTriggerAction => action.type === 'action.trigger'
    ),
    authMethods: authMethods.authenticationMethods,
    configSchema: configSchema.schema
  };
};

let expectActionMatches = (
  actual: Record<string, any> | undefined,
  expected: ExpectedSlateAction
) => {
  let expect = getVitestExpect();
  expect(actual).toBeTruthy();
  expect(actual?.id).toBe(expected.id);

  if (expected.name !== undefined) {
    expect(actual?.name).toBe(expected.name);
  }

  if (expected.description !== undefined) {
    expect(actual?.description).toBe(expected.description);
  }

  if (expected.readOnly !== undefined) {
    expect(actual?.tags?.readOnly ?? false).toBe(expected.readOnly);
  }

  if (expected.destructive !== undefined) {
    expect(actual?.tags?.destructive ?? false).toBe(expected.destructive);
  }

  if (expected.invocationType !== undefined) {
    expect((actual as { invocation?: { type?: string } } | undefined)?.invocation?.type).toBe(
      expected.invocationType
    );
  }
};

export let expectSlateContract = async (d: {
  client: SlatesTestClient;
  provider?: {
    id: string;
    name?: string;
    description?: string;
  };
  toolIds?: string[];
  triggerIds?: string[];
  authMethodIds?: string[];
  tools?: ExpectedSlateAction[];
  triggers?: ExpectedSlateAction[];
}) => {
  let expect = getVitestExpect();
  let contract = await getSlateContract(d.client);

  if (d.provider) {
    expect(contract.provider.id).toBe(d.provider.id);
    if (d.provider.name !== undefined) {
      expect(contract.provider.name).toBe(d.provider.name);
    }
    if (d.provider.description !== undefined) {
      expect(contract.provider.description).toBe(d.provider.description);
    }
  }

  if (d.toolIds) {
    expect(contract.tools.map((action: SlatesToolAction) => action.id)).toEqual(d.toolIds);
  }

  if (d.triggerIds) {
    expect(contract.triggers.map((action: SlatesTriggerAction) => action.id)).toEqual(
      d.triggerIds
    );
  }

  if (d.authMethodIds) {
    expect(contract.authMethods.map((method: SlateAuthenticationMethod) => method.id)).toEqual(
      d.authMethodIds
    );
  }

  for (let tool of d.tools ?? []) {
    expectActionMatches(
      contract.tools.find((action: SlatesToolAction) => action.id === tool.id),
      tool
    );
  }

  for (let trigger of d.triggers ?? []) {
    expectActionMatches(
      contract.triggers.find((action: SlatesTriggerAction) => action.id === trigger.id),
      trigger
    );
  }

  return contract;
};

export let registerSlateTriggerWebhook = async (d: {
  client: SlatesTestClient;
  triggerId: string;
  webhookBaseUrl: string;
}) => d.client.registerTriggerWebhook(d.triggerId, d.webhookBaseUrl);

export let pollSlateTriggerEvents = async (d: {
  client: SlatesTestClient;
  triggerId: string;
  state?: any;
}) => {
  d.client.ensureSession();
  return d.client.request('slates/action.trigger.poll_events', {
    actionId: d.triggerId,
    state: d.state ?? null
  });
};

export let handleSlateTriggerWebhook = async (d: {
  client: SlatesTestClient;
  triggerId: string;
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string | Uint8Array | null;
  state?: any;
}) =>
  d.client.handleTriggerWebhook({
    actionId: d.triggerId,
    url: d.url,
    method: d.method ?? 'POST',
    headers: d.headers,
    body: d.body,
    state: d.state
  });

export let unregisterSlateTriggerWebhook = async (d: {
  client: SlatesTestClient;
  triggerId: string;
  webhookBaseUrl: string;
  registrationDetails: any;
  state?: any;
}) =>
  d.client.unregisterTriggerWebhook({
    actionId: d.triggerId,
    webhookBaseUrl: d.webhookBaseUrl,
    registrationDetails: d.registrationDetails,
    state: d.state
  });

export let mapSlateTriggerEvent = async (d: {
  client: SlatesTestClient;
  triggerId: string;
  input: Record<string, any>;
  output?: Record<string, any>;
  type?: string;
}) => {
  let expect = getVitestExpect();
  let result = await d.client.mapTriggerEvent(d.triggerId, d.input);

  if (d.type !== undefined) {
    expect(result.type).toBe(d.type);
  }

  if (d.output) {
    expect(result.output).toMatchObject(d.output);
  }

  return result;
};

export let expectSlateError = async (
  run: Promise<unknown> | (() => Promise<unknown>),
  expected: Record<string, any> | string | RegExp
) => {
  let expect = getVitestExpect();
  try {
    await (typeof run === 'function' ? run() : run);
  } catch (error) {
    if (typeof expected === 'string' || expected instanceof RegExp) {
      let message = error instanceof Error ? error.message : String(error);
      if (expected instanceof RegExp) {
        expect(message).toMatch(expected);
      } else {
        expect(message).toContain(expected);
      }
    } else if (error instanceof SlateProtocolError) {
      expect(error.data).toMatchObject(expected);
    } else {
      expect(error).toMatchObject(expected);
    }

    return error;
  }

  throw new Error('Expected the operation to fail, but it completed successfully.');
};
