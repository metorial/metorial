import { openSlatesCliStore } from '@slates/profiles';
import {
  createTextAttachment,
  Slate,
  SlateAuth,
  SlateConfig,
  SlateSpecification,
  SlateTool,
  SlateTrigger
} from '@slates/provider';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  createLocalSlateTestClient,
  expectSlateContract,
  expectSlateError,
  expectToolCall,
  handleSlateTriggerWebhook,
  loadSlatesRuntimeContext,
  mapSlateTriggerEvent,
  pollSlateTriggerEvents,
  registerSlateTriggerWebhook,
  unregisterSlateTriggerWebhook
} from './index';

(globalThis as typeof globalThis & { expect?: typeof expect }).expect = expect;

let tempDirs: string[] = [];

let createTempDir = async () => {
  let dir = await mkdtemp(path.join(tmpdir(), 'slates-test-'));
  tempDirs.push(dir);
  return dir;
};

afterEach(async () => {
  delete process.env.SLATES_INTEGRATION;
  delete process.env.SLATES_PROFILE_ID;
  delete process.env.SLATES_STORE_PATH;
  delete process.env.SLATES_STORE_ROOT_DIR;
  delete process.env.SLATES_TEST_CONTEXT_PATH;
  await Promise.all(tempDirs.splice(0).map(dir => rm(dir, { recursive: true, force: true })));
});

let createDemoSlate = () => {
  let config = SlateConfig.create(
    z.object({
      prefix: z.string()
    })
  ).getDefaultConfig(() => ({
    prefix: 'Hello'
  }));

  let auth = SlateAuth.create<{ token: string }>()
    .output(
      z.object({
        token: z.string()
      })
    )
    .addTokenAuth({
      type: 'auth.token',
      key: 'token_auth',
      name: 'Token Auth',
      inputSchema: z.object({
        token: z.string()
      }),
      getOutput: async ctx => ({
        output: {
          token: ctx.input.token
        }
      })
    });

  let spec = SlateSpecification.create({
    key: 'demo-slate',
    name: 'Demo Slate',
    description: 'A tiny test slate',
    config,
    auth
  });

  let echo = SlateTool.create(spec, {
    key: 'echo',
    name: 'Echo',
    tags: {
      readOnly: false
    }
  })
    .input(
      z.object({
        name: z.string()
      })
    )
    .output(
      z.object({
        greeting: z.string(),
        token: z.string()
      })
    )
    .handleInvocation(async ctx => ({
      output: {
        greeting: `${ctx.config.prefix} ${ctx.input.name}`,
        token: ctx.auth.token
      },
      message: 'done'
    }))
    .build();

  let fail = SlateTool.create(spec, {
    key: 'fail',
    name: 'Fail'
  })
    .input(
      z.object({
        reason: z.string()
      })
    )
    .output(z.object({}))
    .handleInvocation(async ctx => {
      throw new Error(ctx.input.reason);
    })
    .build();

  let attachmentEcho = SlateTool.create(spec, {
    key: 'attachment_echo',
    name: 'Attachment Echo',
    tags: {
      readOnly: true
    }
  })
    .input(
      z.object({
        mimeType: z.string().optional()
      })
    )
    .output(
      z.object({
        size: z.number()
      })
    )
    .handleInvocation(async ctx => ({
      output: {
        size: 5
      },
      message: 'attached',
      attachments: [createTextAttachment('hello', ctx.input.mimeType)]
    }))
    .build();

  let downloadLink = SlateTool.create(spec, {
    key: 'download_link',
    name: 'Download Link',
    tags: {
      readOnly: true
    }
  })
    .input(z.object({}))
    .output(
      z.object({
        downloadUrl: z.string()
      })
    )
    .handleInvocation(async () => ({
      output: {
        downloadUrl: 'https://example.com/files/demo.txt'
      },
      message: 'linked'
    }))
    .build();

  let webhookEcho = SlateTrigger.create(spec, {
    key: 'webhook_echo',
    name: 'Webhook Echo'
  })
    .input(
      z.object({
        value: z.string()
      })
    )
    .output(
      z.object({
        echoed: z.string()
      })
    )
    .webhook({
      autoRegisterWebhook: async ctx => ({
        registrationDetails: {
          webhookBaseUrl: ctx.input.webhookBaseUrl,
          channelId: 'channel-1'
        },
        state: {
          registered: true
        }
      }),
      autoUnregisterWebhook: async ctx => {
        if (ctx.input.registrationDetails?.channelId !== 'channel-1') {
          throw new Error('Unexpected channel');
        }
      },
      handleRequest: async ctx => {
        if (ctx.request.headers.get('x-demo-event') === 'ignore') {
          return { inputs: [] };
        }

        return {
          inputs: [
            {
              value: (await ctx.request.text()) || 'empty'
            }
          ],
          updatedState: {
            lastEvent: ctx.request.headers.get('x-demo-event') ?? 'unknown'
          }
        };
      },
      handleEvent: async ctx => ({
        type: 'demo.webhook',
        id: `webhook-${ctx.input.value}`,
        output: {
          echoed: ctx.input.value
        }
      })
    })
    .build();

  let pollEcho = SlateTrigger.create(spec, {
    key: 'poll_echo',
    name: 'Poll Echo'
  })
    .input(
      z.object({
        value: z.string()
      })
    )
    .output(
      z.object({
        echoed: z.string()
      })
    )
    .polling({
      pollEvents: async ctx => ({
        inputs: ctx.input.state?.seen ? [] : [{ value: 'poll-value' }],
        updatedState: {
          seen: true
        }
      }),
      handleEvent: async ctx => ({
        type: 'demo.poll',
        id: `poll-${ctx.input.value}`,
        output: {
          echoed: ctx.input.value
        }
      })
    })
    .build();

  return Slate.create({
    spec,
    tools: [echo, fail, attachmentEcho, downloadLink],
    triggers: [webhookEcho, pollEcho]
  });
};

describe('@slates/test', () => {
  it('loads runtime context from the CLI handoff file', async () => {
    let cwd = await createTempDir();
    let store = await openSlatesCliStore({
      cwd,
      scope: {
        key: 'integrations/demo',
        name: 'demo'
      }
    });
    let profile = store.upsertProfile({
      name: 'Demo',
      target: {
        type: 'local',
        entry: './demo-slate.mjs',
        exportName: 'provider'
      }
    });
    await store.save();

    let runtimeContextPath = path.join(cwd, 'runtime.json');
    await writeFile(
      runtimeContextPath,
      JSON.stringify({
        integration: 'integrations/demo',
        profileId: profile.id,
        storePath: store.storePath,
        cliDir: store.dirPath
      }),
      'utf-8'
    );

    process.env.SLATES_TEST_CONTEXT_PATH = runtimeContextPath;

    let context = await loadSlatesRuntimeContext({ cwd });
    expect(context.integration).toBe('integrations/demo');
    expect(context.profileId).toBe(profile.id);
    expect(context.profile?.target.type).toBe('local');
    expect(context.storePath).toBe(store.storePath);
  });

  it('loads only the selected auth method from the runtime context', async () => {
    let cwd = await createTempDir();
    let store = await openSlatesCliStore({
      cwd,
      scope: {
        key: 'integrations/demo',
        name: 'demo'
      }
    });
    let profile = store.upsertProfile({
      name: 'Demo',
      target: {
        type: 'local',
        entry: './demo-slate.mjs',
        exportName: 'provider'
      }
    });
    store.upsertAuth(profile.id, {
      authMethodId: 'oauth',
      authMethodName: 'Bot OAuth',
      authType: 'auth.oauth',
      input: {},
      output: {
        token: 'bot-token'
      },
      scopes: ['chat:write']
    });
    store.upsertAuth(profile.id, {
      authMethodId: 'user_oauth',
      authMethodName: 'User OAuth',
      authType: 'auth.oauth',
      input: {},
      output: {
        token: 'user-token'
      },
      scopes: ['search:read']
    });
    await store.save();

    let runtimeContextPath = path.join(cwd, 'runtime.json');
    await writeFile(
      runtimeContextPath,
      JSON.stringify({
        integration: 'integrations/demo',
        profileId: profile.id,
        authMethodId: 'user_oauth',
        storePath: store.storePath,
        cliDir: store.dirPath
      }),
      'utf-8'
    );

    process.env.SLATES_TEST_CONTEXT_PATH = runtimeContextPath;

    let context = await loadSlatesRuntimeContext({ cwd });
    expect(context.authMethodId).toBe('user_oauth');
    expect(Object.keys(context.profile?.auth ?? {})).toEqual(['user_oauth']);
    expect(context.profile?.auth.user_oauth?.output.token).toBe('user-token');
  });

  it('creates local slate clients and asserts provider contracts', async () => {
    let client = createLocalSlateTestClient({
      slate: createDemoSlate(),
      state: {
        config: {
          prefix: 'Hi'
        },
        auth: {
          authenticationMethodId: 'token_auth',
          output: {
            token: 'secret-token'
          }
        }
      }
    });

    let contract = await expectSlateContract({
      client,
      provider: {
        id: 'demo-slate',
        name: 'Demo Slate',
        description: 'A tiny test slate'
      },
      toolIds: ['echo', 'fail', 'attachment_echo', 'download_link'],
      triggerIds: ['webhook_echo', 'poll_echo'],
      authMethodIds: ['token_auth'],
      tools: [
        { id: 'echo', readOnly: false, destructive: false },
        { id: 'fail', readOnly: false, destructive: false },
        { id: 'attachment_echo', readOnly: true, destructive: false },
        { id: 'download_link', readOnly: true, destructive: false }
      ],
      triggers: [
        { id: 'webhook_echo', invocationType: 'webhook' },
        { id: 'poll_echo', invocationType: 'polling' }
      ]
    });

    expect(contract.configSchema.properties.prefix.type).toBe('string');

    await expectToolCall({
      client,
      toolId: 'echo',
      input: {
        name: 'Tobias'
      },
      output: {
        greeting: 'Hi Tobias',
        token: 'secret-token'
      }
    });

    let attachmentResult = await client.invokeTool('attachment_echo', {
      mimeType: 'text/plain'
    });
    expect(attachmentResult.attachments).toEqual([
      {
        mimeType: 'text/plain',
        content: {
          type: 'content',
          encoding: 'utf-8',
          content: 'hello'
        }
      }
    ]);

    let downloadResult = await client.invokeTool('download_link', {});
    expect(downloadResult.attachments).toEqual([
      {
        content: {
          type: 'url',
          url: 'https://example.com/files/demo.txt'
        }
      }
    ]);
  });

  it('wraps trigger webhook flows and error assertions', async () => {
    let client = createLocalSlateTestClient({
      slate: createDemoSlate(),
      state: {
        config: {
          prefix: 'Hi'
        },
        auth: {
          authenticationMethodId: 'token_auth',
          output: {
            token: 'secret-token'
          }
        }
      }
    });

    let registration = await registerSlateTriggerWebhook({
      client,
      triggerId: 'webhook_echo',
      webhookBaseUrl: 'https://example.com/hooks/google-calendar'
    });
    expect(registration).toMatchObject({
      registrationDetails: {
        webhookBaseUrl: 'https://example.com/hooks/google-calendar',
        channelId: 'channel-1'
      },
      state: {
        registered: true
      }
    });

    let ignored = await handleSlateTriggerWebhook({
      client,
      triggerId: 'webhook_echo',
      url: 'https://example.com/hooks/google-calendar',
      headers: {
        'x-demo-event': 'ignore'
      }
    });
    expect(ignored.inputs).toEqual([]);

    let handled = await handleSlateTriggerWebhook({
      client,
      triggerId: 'webhook_echo',
      url: 'https://example.com/hooks/google-calendar',
      headers: {
        'x-demo-event': 'created'
      },
      body: 'payload-value'
    });
    expect(handled).toMatchObject({
      inputs: [{ value: 'payload-value' }],
      updatedState: {
        lastEvent: 'created'
      }
    });

    let mapped = await mapSlateTriggerEvent({
      client,
      triggerId: 'webhook_echo',
      input: {
        value: 'payload-value'
      },
      type: 'demo.webhook',
      output: {
        echoed: 'payload-value'
      }
    });
    expect(mapped.id).toBe('webhook-payload-value');

    await unregisterSlateTriggerWebhook({
      client,
      triggerId: 'webhook_echo',
      webhookBaseUrl: 'https://example.com/hooks/google-calendar',
      registrationDetails: registration.registrationDetails
    });

    await expectSlateError(
      () =>
        client.invokeTool('fail', {
          reason: 'intentional failure'
        }),
      { code: 'internal.unexpected', kind: 'internal', status: 500 }
    );
  });

  it('wraps trigger polling flows', async () => {
    let client = createLocalSlateTestClient({
      slate: createDemoSlate(),
      state: {
        config: {
          prefix: 'Hi'
        },
        auth: {
          authenticationMethodId: 'token_auth',
          output: {
            token: 'secret-token'
          }
        }
      }
    });

    let initialPoll = await pollSlateTriggerEvents({
      client,
      triggerId: 'poll_echo'
    });
    expect(initialPoll).toMatchObject({
      inputs: [{ value: 'poll-value' }],
      updatedState: {
        seen: true
      }
    });

    let mapped = await mapSlateTriggerEvent({
      client,
      triggerId: 'poll_echo',
      input: initialPoll.inputs[0]!,
      type: 'demo.poll',
      output: {
        echoed: 'poll-value'
      }
    });
    expect(mapped.id).toBe('poll-poll-value');

    let repeatedPoll = await pollSlateTriggerEvents({
      client,
      triggerId: 'poll_echo',
      state: initialPoll.updatedState
    });
    expect(repeatedPoll.inputs).toEqual([]);
    expect(repeatedPoll.updatedState).toEqual({
      seen: true
    });
  });
});
