import {
  axios,
  Slate,
  SlateAuth,
  SlateConfig,
  type SlateLogEntry,
  SlateSpecification,
  SlateTool,
  SlateTrigger
} from '@slates/provider';
import { rm } from 'fs/promises';
import { createServer } from 'http';
import type { AddressInfo } from 'net';
import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createLocalSlateTransport, createSlatesClient, SlateProtocolError } from './index';

let tempDirs: string[] = [];

let waitForLogs = async () => {
  await new Promise(resolve => setTimeout(resolve, 25));
};

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map(dir => rm(dir, { recursive: true, force: true })));
});

let createDemoSlate = () => {
  let demoConfig = SlateConfig.create(
    z.object({
      prefix: z.string()
    })
  )
    .getDefaultConfig(() => ({
      prefix: 'Hello'
    }))
    .docs([
      {
        type: 'docs.config.general',
        name: 'Demo config docs',
        url: 'https://example.com/docs/config'
      }
    ]);

  let demoAuth = SlateAuth.create<{ token: string }>()
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
      docs: [
        {
          type: 'docs.auth.token',
          name: 'Demo token auth docs',
          url: 'https://example.com/docs/auth/token'
        }
      ],
      getDefaultInput: async () => ({
        token: 'default-token'
      }),
      onInputChanged: async (ctx: { newInput: { token: string } }) => ({
        input: {
          token: ctx.newInput.token.trim()
        }
      }),
      getOutput: async (ctx: { input: { token: string } }) => ({
        output: {
          token: ctx.input.token
        },
        scopes: [`scope:${ctx.input.token}`]
      }),
      getProfile: async (ctx: { output: { token: string } }) => ({
        profile: {
          tokenPreview: ctx.output.token.slice(0, 3)
        }
      })
    });

  let spec = SlateSpecification.create({
    key: 'demo-slate',
    name: 'Demo Slate',
    description: 'A tiny test slate',
    docs: [
      {
        name: 'Demo provider docs',
        url: 'https://example.com/docs/provider'
      }
    ],
    config: demoConfig,
    auth: demoAuth
  });

  let echoTool = SlateTool.create(spec, {
    key: 'echo',
    name: 'Echo',
    docs: [
      {
        type: 'docs.action.general',
        name: 'Echo tool docs',
        url: 'https://example.com/docs/actions/echo'
      }
    ]
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
    .scopes({
      AND: [
        {
          OR: ['scope:echo', 'scope:echo:admin']
        }
      ]
    })
    .authMethods(['token_auth'])
    .handleInvocation(async ctx => ({
      output: {
        greeting: `${ctx.config.prefix} ${ctx.input.name}`,
        token: ctx.auth.token
      },
      message: 'done'
    }))
    .build();

  return Slate.create({
    spec,
    tools: [echoTool],
    triggers: []
  });
};

let createTraceSlate = (baseUrl: string) => {
  let config = SlateConfig.create(z.object({}));
  let auth = SlateAuth.create<{}>().output(z.object({}));

  let spec = SlateSpecification.create({
    key: 'trace-slate',
    name: 'Trace Slate',
    description: 'A slate that traces HTTP requests',
    config,
    auth
  });

  let traceTool = SlateTool.create(spec, {
    key: 'trace_http',
    name: 'Trace HTTP'
  })
    .input(z.object({}))
    .output(
      z.object({
        ok: z.boolean(),
        status: z.number(),
        traceCount: z.number()
      })
    )
    .handleInvocation(async ctx => {
      let response = await axios.post(
        `${baseUrl}/trace?api_key=request-secret&visible=yes`,
        {
          message: 'hello',
          secret: 'client-secret'
        },
        {
          headers: {
            Authorization: 'Bearer client-token',
            'X-Api-Key': 'client-api-key'
          }
        }
      );

      return {
        output: {
          ok: response.data.ok,
          status: response.status,
          traceCount: ctx.getHttpTraces().length
        },
        message: 'traced'
      };
    })
    .build();

  return Slate.create({
    spec,
    tools: [traceTool],
    triggers: []
  });
};

let createTraceErrorSlate = (baseUrl: string) => {
  let config = SlateConfig.create(z.object({}));
  let auth = SlateAuth.create<{}>().output(z.object({}));

  let spec = SlateSpecification.create({
    key: 'trace-error-slate',
    name: 'Trace Error Slate',
    description: 'A slate that traces failed HTTP requests',
    config,
    auth
  });

  let traceTool = SlateTool.create(spec, {
    key: 'trace_http_error',
    name: 'Trace HTTP Error'
  })
    .input(z.object({}))
    .output(
      z.object({
        ok: z.boolean()
      })
    )
    .handleInvocation(async () => {
      await axios.post(
        `${baseUrl}/trace-error?client_secret=request-secret`,
        new URLSearchParams({
          grant_type: 'authorization_code',
          client_secret: 'client-secret'
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: 'Bearer client-token'
          }
        }
      );

      return {
        output: {
          ok: true
        },
        message: 'should not reach'
      };
    })
    .build();

  return Slate.create({
    spec,
    tools: [traceTool],
    triggers: []
  });
};

let createTriggerTraceSlate = () => {
  let config = SlateConfig.create(z.object({}));
  let auth = SlateAuth.create<{}>().output(z.object({}));

  let spec = SlateSpecification.create({
    key: 'trigger-trace-slate',
    name: 'Trigger Trace Slate',
    description: 'A slate that traces trigger execution',
    config,
    auth
  });

  let pollingTrigger = SlateTrigger.create(spec, {
    key: 'poll_trigger',
    name: 'Poll Trigger'
  })
    .input(
      z.object({
        id: z.string()
      })
    )
    .output(
      z.object({
        type: z.string(),
        value: z.string()
      })
    )
    .polling({
      pollEvents: async () => ({
        inputs: [{ id: 'poll-1' }, { id: 'poll-2' }]
      }),
      handleEvent: async ctx => ({
        id: ctx.input.id,
        type: 'poll.event',
        output: {
          type: 'poll.event',
          value: ctx.input.id
        }
      })
    })
    .build();

  let webhookTrigger = SlateTrigger.create(spec, {
    key: 'webhook_trigger',
    name: 'Webhook Trigger'
  })
    .input(
      z.object({
        id: z.string()
      })
    )
    .output(
      z.object({
        type: z.string(),
        value: z.string()
      })
    )
    .webhook({
      handleRequest: async () => ({
        inputs: [{ id: 'webhook-1' }, { id: 'webhook-2' }]
      }),
      handleEvent: async ctx => ({
        id: ctx.input.id,
        type: 'webhook.event',
        output: {
          type: 'webhook.event',
          value: ctx.input.id
        }
      })
    })
    .build();

  return Slate.create({
    spec,
    tools: [],
    triggers: [pollingTrigger, webhookTrigger]
  });
};

type OAuthConfig = {
  loginHost: string;
};

type OAuthOutput = {
  token: string;
  refreshToken?: string;
};

type SeenOAuthConfig = Partial<
  Record<'authorizationUrl' | 'callback' | 'refresh' | 'profile', OAuthConfig>
>;

let getRequiredOAuthConfig = (ctx: { config?: Record<string, unknown> }): OAuthConfig => {
  expect(ctx.config).toBeDefined();
  return ctx.config as OAuthConfig;
};

let createOauthConfigSlate = (seenConfig: SeenOAuthConfig) => {
  let config = SlateConfig.create(
    z.object({
      loginHost: z.string()
    })
  );

  let auth = SlateAuth.create<{ token: string; refreshToken?: string }>()
    .output(
      z.object({
        token: z.string(),
        refreshToken: z.string().optional()
      })
    )
    .addOauth({
      type: 'auth.oauth',
      key: 'oauth',
      name: 'OAuth',
      scopes: [],
      inputSchema: z.object({}),
      getAuthorizationUrl: async ctx => {
        let config = getRequiredOAuthConfig(ctx);
        seenConfig.authorizationUrl = config;
        return {
          url: `https://${config.loginHost}/authorize`,
          callbackState: {
            loginHost: config.loginHost
          }
        };
      },
      handleCallback: async ctx => {
        let config = getRequiredOAuthConfig(ctx);
        seenConfig.callback = config;
        return {
          output: {
            token: `token:${config.loginHost}`,
            refreshToken: 'refresh-token'
          }
        };
      },
      handleTokenRefresh: async (ctx: {
        output: OAuthOutput;
        config?: Record<string, unknown>;
      }) => {
        let config = getRequiredOAuthConfig(ctx);
        seenConfig.refresh = config;
        return {
          output: {
            ...ctx.output,
            token: `refreshed:${config.loginHost}`
          }
        };
      },
      getProfile: async (ctx: { config?: Record<string, unknown> }) => {
        let config = getRequiredOAuthConfig(ctx);
        seenConfig.profile = config;
        return {
          profile: {
            loginHost: config.loginHost
          }
        };
      }
    });

  let spec = SlateSpecification.create({
    key: 'oauth-config-slate',
    name: 'OAuth Config Slate',
    description: 'A slate that reads config in OAuth callbacks',
    config,
    auth
  });

  return Slate.create({
    spec,
    tools: [],
    triggers: []
  });
};

type TokenConfig = {
  prefix: string;
};

type SeenTokenConfig = Partial<Record<'output' | 'profile', TokenConfig>>;

let getRequiredTokenConfig = (ctx: { config?: Record<string, unknown> }): TokenConfig => {
  expect(ctx.config).toBeDefined();
  return ctx.config as TokenConfig;
};

type TokenAuthOutputContext = {
  input: { token: string };
  config?: Record<string, unknown>;
};

type TokenAuthProfileContext = {
  output: { token: string };
  config?: Record<string, unknown>;
};

let createTokenConfigSlate = (seenConfig: SeenTokenConfig) => {
  let config = SlateConfig.create(
    z.object({
      prefix: z.string()
    })
  );

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
      getOutput: async (ctx: TokenAuthOutputContext) => {
        let currentConfig = getRequiredTokenConfig(ctx);
        seenConfig.output = currentConfig;
        return {
          output: {
            token: `${currentConfig.prefix}:${ctx.input.token}`
          }
        };
      },
      getProfile: async (ctx: TokenAuthProfileContext) => {
        let currentConfig = getRequiredTokenConfig(ctx);
        seenConfig.profile = currentConfig;
        return {
          profile: {
            prefix: currentConfig.prefix,
            token: ctx.output.token
          }
        };
      }
    });

  let spec = SlateSpecification.create({
    key: 'token-config-slate',
    name: 'Token Config Slate',
    description: 'A slate that reads config in token auth hooks',
    config,
    auth
  });

  return Slate.create({
    spec,
    tools: [],
    triggers: []
  });
};

describe('@slates/client local transport', () => {
  it('discovers auth/config and invokes tools with session state', async () => {
    let slate = createDemoSlate();
    let client = createSlatesClient({
      transport: createLocalSlateTransport({ slate })
    });

    let provider = await client.identify();
    expect(provider.provider.id).toBe('demo-slate');
    expect(provider.docs).toEqual([
      {
        name: 'Demo provider docs',
        url: 'https://example.com/docs/provider'
      }
    ]);

    let actions = await client.listTools();
    expect(actions).toHaveLength(1);
    expect(actions[0]!.id).toBe('echo');
    expect(actions[0]!.docs).toEqual([
      {
        type: 'docs.action.general',
        name: 'Echo tool docs',
        url: 'https://example.com/docs/actions/echo'
      }
    ]);
    expect(actions[0]!.scopes).toEqual({
      AND: [
        {
          OR: ['scope:echo', 'scope:echo:admin']
        }
      ]
    });
    expect(actions[0]!.authMethods).toEqual(['token_auth']);

    let configSchema = await client.getConfigSchema();
    expect(configSchema.schema.properties.prefix.type).toBe('string');
    expect(configSchema.docs).toEqual([
      {
        type: 'docs.config.general',
        name: 'Demo config docs',
        url: 'https://example.com/docs/config'
      }
    ]);

    let defaultConfig = await client.getDefaultConfig();
    expect(defaultConfig.config).toEqual({ prefix: 'Hello' });

    let authMethods = await client.listAuthMethods();
    expect(authMethods.authenticationMethods).toHaveLength(1);
    expect(authMethods.authenticationMethods[0]!.type).toBe('auth.token');
    expect(authMethods.authenticationMethods[0]!.docs).toEqual([
      {
        type: 'docs.auth.token',
        name: 'Demo token auth docs',
        url: 'https://example.com/docs/auth/token'
      }
    ]);

    let defaultInput = await client.getDefaultAuthInput('token_auth');
    expect(defaultInput.input).toEqual({ token: 'default-token' });

    let changedInput = await client.updateAuthInput({
      authenticationMethodId: 'token_auth',
      previousInput: null,
      newInput: { token: '  trimmed-token  ' }
    });
    expect(changedInput.input).toEqual({ token: 'trimmed-token' });

    let authOutput = await client.getAuthOutput({
      authenticationMethodId: 'token_auth',
      input: changedInput.input ?? { token: '' }
    });
    expect(authOutput.output).toEqual({ token: 'trimmed-token' });
    expect(authOutput.scopes).toEqual(['scope:trimmed-token']);

    client.setConfig({ prefix: 'Hi' });
    client.setAuth({
      authenticationMethodId: 'token_auth',
      output: authOutput.output
    });

    let result = await client.invokeTool('echo', { name: 'Tobias' });
    expect(result.output).toEqual({
      greeting: 'Hi Tobias',
      token: 'trimmed-token'
    });
    expect(client.state.session?.id).toBeTruthy();
  });

  it('emits structured traces for provider callbacks', async () => {
    let slate = createDemoSlate();
    let logs: SlateLogEntry[] = [];
    let client = createSlatesClient({
      transport: createLocalSlateTransport({
        slate,
        listeners: [
          entries => {
            logs.push(...entries);
          }
        ]
      })
    });

    await client.identify();
    await client.getDefaultConfig();
    let changedInput = await client.updateAuthInput({
      authenticationMethodId: 'token_auth',
      previousInput: null,
      newInput: { token: '  traced-token  ' }
    });
    let authOutput = await client.getAuthOutput({
      authenticationMethodId: 'token_auth',
      input: changedInput.input ?? { token: '' }
    });

    client.setConfig({ prefix: 'Hi' });
    client.setAuth({
      authenticationMethodId: 'token_auth',
      output: authOutput.output
    });
    await client.invokeTool('echo', { name: 'Tracing' });

    await waitForLogs();

    expect(logs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'info',
          message: 'Getting default config',
          data: expect.objectContaining({
            providerId: 'demo-slate',
            component: 'config',
            functionName: 'getDefaultConfig',
            phase: 'start'
          })
        }),
        expect.objectContaining({
          type: 'info',
          message: 'Authentication input change handler completed',
          data: expect.objectContaining({
            providerId: 'demo-slate',
            component: 'auth',
            functionName: 'onInputChanged',
            phase: 'success',
            authenticationMethodId: 'token_auth',
            returnedInput: true
          })
        }),
        expect.objectContaining({
          type: 'info',
          message: 'Completed tool "Echo" (echo)',
          data: expect.objectContaining({
            providerId: 'demo-slate',
            component: 'action',
            functionName: 'handleInvocation',
            phase: 'success',
            actionId: 'echo',
            hasMessage: true,
            actionResultMessage: 'done'
          })
        })
      ])
    );
  });

  it('emits human-readable trigger event count logs', async () => {
    let logs: SlateLogEntry[] = [];
    let client = createSlatesClient({
      transport: createLocalSlateTransport({
        slate: createTriggerTraceSlate(),
        listeners: [
          entries => {
            logs.push(...entries);
          }
        ]
      }),
      state: {
        config: {}
      }
    });

    client.ensureSession();

    await client.request('slates/action.trigger.poll_events', {
      actionId: 'poll_trigger',
      state: null
    });

    await client.request('slates/action.trigger.webhook_handle', {
      actionId: 'webhook_trigger',
      url: 'https://example.com/webhook',
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: null,
      state: null
    });

    await waitForLogs();

    expect(logs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'info',
          message: 'Polled 2 event(s) for trigger "Poll Trigger" (poll_trigger)',
          data: expect.objectContaining({
            component: 'action',
            functionName: 'pollEvents',
            inputCount: 2,
            actionId: 'poll_trigger'
          })
        }),
        expect.objectContaining({
          type: 'info',
          message:
            'Received 2 webhook event(s) for trigger "Webhook Trigger" (webhook_trigger)',
          data: expect.objectContaining({
            component: 'action',
            functionName: 'handleRequest',
            inputCount: 2,
            actionId: 'webhook_trigger'
          })
        })
      ])
    );
  });

  it('passes current profile config into OAuth callbacks', async () => {
    let seenConfig: SeenOAuthConfig = {};
    let client = createSlatesClient({
      transport: createLocalSlateTransport({
        slate: createOauthConfigSlate(seenConfig)
      }),
      state: {
        config: {
          loginHost: 'sandbox.example.com'
        }
      }
    });

    let authorizationUrl = await client.getAuthorizationUrl({
      authenticationMethodId: 'oauth',
      redirectUri: 'http://localhost:3000/callback',
      state: 'state-1',
      input: {},
      clientId: 'client-id',
      clientSecret: 'client-secret',
      scopes: []
    });

    expect(authorizationUrl.authorizationUrl).toBe('https://sandbox.example.com/authorize');
    expect(authorizationUrl.callbackState).toEqual({
      loginHost: 'sandbox.example.com'
    });

    let callback = await client.handleAuthorizationCallback({
      authenticationMethodId: 'oauth',
      code: 'code-1',
      state: 'state-1',
      redirectUri: 'http://localhost:3000/callback',
      input: {},
      clientId: 'client-id',
      clientSecret: 'client-secret',
      scopes: [],
      callbackState: authorizationUrl.callbackState
    });

    expect(callback.output).toEqual({
      token: 'token:sandbox.example.com',
      refreshToken: 'refresh-token'
    });

    let refreshed = await client.refreshToken({
      authenticationMethodId: 'oauth',
      output: callback.output,
      input: {},
      clientId: 'client-id',
      clientSecret: 'client-secret',
      scopes: []
    });

    expect(refreshed.output.token).toBe('refreshed:sandbox.example.com');

    let profile = await client.getAuthProfile({
      authenticationMethodId: 'oauth',
      output: refreshed.output,
      input: {},
      scopes: []
    });

    expect(profile.profile).toEqual({
      loginHost: 'sandbox.example.com'
    });
    expect(seenConfig).toEqual({
      authorizationUrl: { loginHost: 'sandbox.example.com' },
      callback: { loginHost: 'sandbox.example.com' },
      refresh: { loginHost: 'sandbox.example.com' },
      profile: { loginHost: 'sandbox.example.com' }
    });
  });

  it('passes current profile config into token auth callbacks', async () => {
    let seenConfig: SeenTokenConfig = {};
    let client = createSlatesClient({
      transport: createLocalSlateTransport({
        slate: createTokenConfigSlate(seenConfig)
      }),
      state: {
        config: {
          prefix: 'configured'
        }
      }
    });

    let authOutput = await client.getAuthOutput({
      authenticationMethodId: 'token_auth',
      input: {
        token: 'secret-token'
      }
    });

    expect(authOutput.output).toEqual({
      token: 'configured:secret-token'
    });

    let profile = await client.getAuthProfile({
      authenticationMethodId: 'token_auth',
      output: authOutput.output,
      input: {
        token: 'secret-token'
      },
      scopes: []
    });

    expect(profile.profile).toEqual({
      prefix: 'configured',
      token: 'configured:secret-token'
    });
    expect(seenConfig).toEqual({
      output: { prefix: 'configured' },
      profile: { prefix: 'configured' }
    });
  });

  it('throws structured protocol errors for provider responses', async () => {
    let client = createSlatesClient({
      transport: {
        async send(messages) {
          let request = messages.find(message => 'id' in message && message.id);
          return [
            {
              jsonrpc: '2.0',
              id: (request as { id: string }).id,
              error: {
                code: 'resource.not_found',
                kind: 'upstream',
                message: 'Resource contact_123 was not found',
                status: 404,
                provider: {
                  service: 'demo',
                  operation: 'failing.invoke'
                },
                baggage: {
                  resourceId: 'contact_123'
                }
              }
            } as any
          ];
        }
      }
    });

    let promise = client.identify();

    await expect(promise).rejects.toBeInstanceOf(SlateProtocolError);

    try {
      await promise;
    } catch (error) {
      expect(error).toBeInstanceOf(SlateProtocolError);
      expect((error as SlateProtocolError).data).toMatchObject({
        code: 'resource.not_found',
        kind: 'upstream',
        message: 'Resource contact_123 was not found',
        status: 404,
        provider: {
          service: 'demo',
          operation: 'failing.invoke'
        },
        baggage: {
          resourceId: 'contact_123'
        }
      });
    }
  });

  it('returns sanitized request traces for shared axios calls', async () => {
    let server = createServer((_req, res) => {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('X-Request-Id', 'req-123');
      res.end(
        JSON.stringify({
          ok: true,
          token: 'server-secret',
          note: 'x'.repeat(11_000)
        })
      );
    });

    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => resolve());
    });

    try {
      let { port } = server.address() as AddressInfo;
      let client = createSlatesClient({
        transport: createLocalSlateTransport({
          slate: createTraceSlate(`http://127.0.0.1:${port}`)
        }),
        state: {
          config: {}
        }
      });

      let result = await client.invokeTool('trace_http', {});

      expect(result.output).toEqual({
        ok: true,
        status: 200,
        traceCount: 1
      });
      expect(result.requestTraces).toHaveLength(1);

      let trace = result.requestTraces?.[0];
      expect(trace?.request.method).toBe('POST');
      expect(trace?.request.url).toContain('visible=yes');
      expect(trace?.request.url).not.toContain('request-secret');
      expect(trace?.request.headers).toMatchObject({
        accept: 'application/json, text/plain, */*',
        'user-agent': 'slates.dev/1.0.0 trace-slate',
        'x-slates-provider': 'trace-slate'
      });
      expect(trace?.request.headers).not.toHaveProperty('authorization');
      expect(trace?.request.headers).not.toHaveProperty('x-api-key');
      expect(trace?.request.body?.text).toContain('"secret":"[redacted]"');
      expect(trace?.request.body?.text).not.toContain('client-secret');
      expect(trace?.response?.headers).toMatchObject({
        'content-type': 'application/json',
        'x-request-id': 'req-123'
      });
      expect(trace?.response?.body?.truncated).toBe(true);
      expect(trace?.response?.body?.text).toContain('"token":"[redacted]"');
      expect(trace?.response?.body?.text).not.toContain('server-secret');
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close(error => (error ? reject(error) : resolve()));
      });
    }
  });

  it('returns sanitized request traces on provider errors', async () => {
    let server = createServer((_req, res) => {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          error: 'invalid_grant',
          client_secret: 'server-secret'
        })
      );
    });

    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => resolve());
    });

    try {
      let { port } = server.address() as AddressInfo;
      let client = createSlatesClient({
        transport: createLocalSlateTransport({
          slate: createTraceErrorSlate(`http://127.0.0.1:${port}`)
        }),
        state: {
          config: {}
        }
      });

      let error = await client
        .invokeTool('trace_http_error', {})
        .then(() => null)
        .catch(err => err as SlateProtocolError);

      expect(error).toBeInstanceOf(SlateProtocolError);
      expect(error?.data.code).toBe('upstream.invalid_request');
      expect(error?.data.requestTraces).toHaveLength(1);

      let trace = error?.data.requestTraces?.[0] as Record<string, any> | undefined;
      expect(trace?.request.method).toBe('POST');
      expect(trace?.request.url).not.toContain('request-secret');
      expect(trace?.request.headers).not.toHaveProperty('authorization');
      expect(trace?.request.body?.text).toContain('client_secret=[redacted]');
      expect(trace?.response?.status).toBe(400);
      expect(trace?.response?.body?.text).toContain('"client_secret":"[redacted]"');
      expect(trace?.response?.body?.text).not.toContain('server-secret');
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close(error => (error ? reject(error) : resolve()));
      });
    }
  });
});
