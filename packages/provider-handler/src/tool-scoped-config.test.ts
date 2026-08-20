import { ServiceError, validationError } from '@lowerdeck/error';
import { SLATES_PROTOCOL_VERSION, SlatesProviderProtoHandlerManager } from '@slates/proto';
import { auth, configV2, Slate, spec, tool } from '@slates/provider';
import { describe, expect, it, vi } from 'vitest';
import z from 'zod';
import { createProviderHandler } from './index';

let createRuntime = async (
  d: {
    leakOutput?: boolean;
    leakMessage?: boolean;
    throwSentinel?: boolean;
    invalidOutput?: boolean;
    configSecretPayload?: string;
    authSecretPayload?: string;
    providerDelayMs?: number;
    operationTimeoutMs?: number;
    operationSignal?: AbortSignal;
    exerciseLeakChannels?: boolean;
    configSentinel?: string;
    authSentinel?: string;
    authRefinement?: 'issue' | 'log' | 'throw';
    exerciseSanitizerSafety?: boolean;
    throwSanitizerCallable?: boolean;
  } = {}
) => {
  let sentinel = d.configSentinel ?? 'task10-classified-sentinel';
  let authSentinel = d.authSentinel ?? 'task10-auth-sentinel';
  let observed = vi.fn();
  let cleared = vi.fn();
  let arbitraryExecution = vi.fn();
  let logs: unknown[] = [];
  let specification = spec({
    key: 'task10',
    name: 'Task 10',
    config: configV2({
      fields: {
        endpoint: { schema: z.string(), visibility: 'plain', lifecycle: 'none' },
        apiKey: { schema: z.string(), visibility: 'secret', lifecycle: 'projection' }
      }
    }),
    auth: auth()
      .output(
        z.object({
          token: z.string().superRefine((value, refinement) => {
            if (d.authRefinement) console.log(`auth refinement ${value}`);
            if (d.authRefinement === 'throw') {
              throw new Error(`auth refinement rejected ${value}`);
            }
            if (d.authRefinement === 'issue') {
              let message = `auth refinement rejected ${sentinel}/${value}`;
              console.error(
                new ServiceError(
                  validationError({
                    entity: 'auth',
                    message: 'Authentication refinement failed',
                    errors: [{ code: 'custom', path: ['token'], message }]
                  })
                )
              );
              refinement.addIssue({ code: 'custom', message });
            }
          })
        })
      )
      .addTokenAuth({
        type: 'auth.token',
        name: 'API token',
        key: 'api_token',
        inputSchema: z.object({ token: z.string() }),
        getOutput: async context => ({ output: { token: context.input.token } })
      })
  });
  let action = tool(specification, { key: 'read', name: 'Read' })
    .input(z.object({}))
    .output(z.object({ ok: z.boolean(), leaked: z.string().optional() }))
    .handleInvocation(async context => {
      observed({ config: context.config, auth: context.auth, secrets: context.secrets });
      if (d.exerciseLeakChannels) {
        console.log(context.config.apiKey);
        console.info({ nested: context.auth.token });
        console.warn(new Error(`console ${context.config.apiKey}/${context.auth.token}`));
        context.info(context.config.apiKey);
        context.error(new Error(`provider ${context.auth.token}`));
        context.recordHttpTrace({
          startedAt: new Date(0).toISOString(),
          durationMs: 1,
          request: {
            method: 'POST',
            url: `https://example.test/${context.config.apiKey}`,
            headers: { 'x-value': context.auth.token },
            body: { text: `${context.config.apiKey}/${context.auth.token}` }
          },
          response: {
            status: 200,
            body: { text: `${context.auth.token}/${context.config.apiKey}` }
          },
          error: { message: `${context.config.apiKey}/${context.auth.token}` }
        });
      }
      if (d.providerDelayMs) {
        await new Promise(resolve => setTimeout(resolve, d.providerDelayMs));
      }
      if (d.exerciseLeakChannels) console.log(`after delay ${context.config.apiKey}`);
      if (d.exerciseSanitizerSafety) {
        let callable = Object.assign(() => arbitraryExecution('callable'), {
          data: { secret: context.config.apiKey }
        });
        Object.defineProperty(callable, 'dangerous', {
          enumerable: true,
          get: () => {
            arbitraryExecution('callable getter');
            return context.auth.token;
          }
        });
        let error = new Error(`ordinary ${context.config.apiKey}`, {
          cause: { nested: context.auth.token }
        }) as Error & { callable?: unknown };
        error.callable = callable;
        Object.defineProperty(error, 'dangerous', {
          enumerable: true,
          get: () => {
            arbitraryExecution('error getter');
            return context.auth.token;
          }
        });
        console.log(callable);
        console.error(error);
        if (d.throwSanitizerCallable) throw callable;
      }
      if (d.throwSentinel) throw new Error(`provider failed: ${context.config.apiKey}`);
      return {
        output: d.invalidOutput
          ? ({ ok: 'not-a-boolean' } as any)
          : d.leakOutput
            ? { ok: true, leaked: context.config.apiKey }
            : { ok: true },
        message: d.leakMessage ? `done ${context.config.apiKey}` : 'done'
      };
    })
    .build();
  let redeemed = false;
  let manager = await createProviderHandler(
    Slate.create({ spec: specification, tools: [action], triggers: [] }),
    [entries => logs.push(...entries)],
    {
      now: () => 1_000,
      operationTimeoutMs: d.operationTimeoutMs,
      getOperationSignal: () => d.operationSignal,
      redeemScopedInvocationGrant: async ({ envelope, expected }) => {
        if (redeemed) throw new Error('replayed');
        redeemed = true;
        return {
          bindings: {
            grantId: envelope.grantId,
            deploymentId: 'deployment-1',
            runtimeIdentityId: 'runtime-1',
            runtimeIdentityGeneration: 2,
            tenantId: 'tenant',
            slateInstanceId: 'instance',
            configSchemaVersion: 2,
            configSchemaHash: 'schema-hash',
            hubInvocationId: 'invocation',
            requestId: expected.requestId,
            actionId: expected.actionId,
            operation: 'tool_invoke' as const,
            issuedAtMs: 999,
            expiresAtMs: 2_000,
            configSecretVersions: { 'config:apiKey': 7 },
            authConfigId: 'auth-config',
            authSecretVersions: { 'auth:$output': 9 }
          },
          secrets: {
            'config:apiKey': {
              value: d.configSecretPayload ?? JSON.stringify(sentinel),
              version: 7
            },
            'auth:$output': {
              value: d.authSecretPayload ?? JSON.stringify({ token: authSentinel }),
              version: 9
            }
          },
          clear: cleared
        };
      }
    }
  ).run();
  for (let message of [
    {
      jsonrpc: '2.0' as const,
      method: 'slates/hello' as const,
      params: { protocol: SLATES_PROTOCOL_VERSION }
    },
    {
      jsonrpc: '2.0' as const,
      method: 'slates/participant.set' as const,
      params: { participants: [{ type: 'hub' as const, id: 'hub', name: 'Hub' }] }
    },
    {
      jsonrpc: '2.0' as const,
      method: 'slates/config.set' as const,
      params: { config: { endpoint: 'https://example.test', apiKey: { configured: true } } }
    },
    {
      jsonrpc: '2.0' as const,
      method: 'slates/auth.set' as const,
      params: {
        authenticationMethodId: 'api_token',
        output: { $output: { configured: true } }
      }
    },
    {
      jsonrpc: '2.0' as const,
      method: 'slates/session.start' as const,
      params: { sessionId: 'session', state: {} }
    }
  ]) {
    await SlatesProviderProtoHandlerManager.handleInput(manager, message);
  }
  let request = {
    jsonrpc: '2.0' as const,
    id: 'request',
    method: 'slates/action.tool.invoke' as const,
    invocation: {
      version: 'scoped_invocation_grant_v1' as const,
      grantId: 'grant',
      token: 'token',
      requestId: 'request'
    },
    params: { actionId: 'read', input: {} }
  };
  return {
    manager,
    request,
    sentinel,
    authSentinel,
    observed,
    cleared,
    arbitraryExecution,
    logs
  };
};

describe('Task 10 scoped tool config', () => {
  it('redeems classified config for one request and clears it on success', async () => {
    let runtime = await createRuntime();
    let response = await SlatesProviderProtoHandlerManager.handleInput(
      runtime.manager,
      runtime.request
    );
    expect(response).toMatchObject({ result: { output: { ok: true } } });
    expect(runtime.observed).toHaveBeenCalledWith({
      config: { endpoint: 'https://example.test', apiKey: runtime.sentinel },
      auth: { token: runtime.authSentinel },
      secrets: {
        'config:apiKey': { value: runtime.sentinel, version: 7 },
        'auth:$output': {
          value: JSON.stringify({ token: runtime.authSentinel }),
          version: 9
        }
      }
    });
    expect(runtime.cleared).toHaveBeenCalledOnce();
    let replay = await SlatesProviderProtoHandlerManager.handleInput(
      runtime.manager,
      runtime.request
    );
    expect(replay).toHaveProperty('error');
    expect(runtime.observed).toHaveBeenCalledTimes(1);
  });

  it('rejects provider output that tries to reinsert a classified value', async () => {
    let runtime = await createRuntime({ leakOutput: true });
    let response = await SlatesProviderProtoHandlerManager.handleInput(
      runtime.manager,
      runtime.request
    );
    expect(response).toHaveProperty('error');
    expect(JSON.stringify(response)).not.toContain(runtime.sentinel);
    expect(runtime.cleared).toHaveBeenCalledOnce();
  });

  it.each([
    'returned',
    'thrown'
  ] as const)('redacts a %s sentinel before logs, traces, and the RPC response', async mode => {
    let reported: unknown[][] = [];
    let reportSpy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      reported.push(args);
    });
    try {
      let runtime = await createRuntime({
        leakMessage: mode === 'returned',
        throwSentinel: mode === 'thrown'
      });
      let response = await SlatesProviderProtoHandlerManager.handleInput(
        runtime.manager,
        runtime.request
      );
      await new Promise(resolve => setTimeout(resolve, 20));
      expect(JSON.stringify(response)).not.toContain(runtime.sentinel);
      expect(JSON.stringify(response)).not.toContain(runtime.authSentinel);
      expect(JSON.stringify(runtime.logs)).not.toContain(runtime.sentinel);
      expect(JSON.stringify(runtime.logs)).not.toContain(runtime.authSentinel);
      expect(JSON.stringify(reported)).not.toContain(runtime.sentinel);
      expect(JSON.stringify(reported)).not.toContain(runtime.authSentinel);
      expect(runtime.cleared).toHaveBeenCalledOnce();
    } finally {
      reportSpy.mockRestore();
    }
  });

  it('reconstructs ServiceError records after an auth issue without retaining nested secrets', async () => {
    let reported: unknown[][] = [];
    let logSpy = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      reported.push(['log', ...args]);
    });
    let errorSpy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      reported.push(['error', ...args]);
    });
    try {
      let runtime = await createRuntime({ authRefinement: 'issue' });
      let response = await SlatesProviderProtoHandlerManager.handleInput(
        runtime.manager,
        runtime.request
      );
      let reportedServiceError = reported
        .flat()
        .find(value => value instanceof ServiceError) as ServiceError<any> | undefined;

      expect(response).toMatchObject({
        error: {
          code: 'input.invalid',
          status: 400,
          issues: [{ code: 'custom', message: expect.stringContaining('[redacted]') }]
        }
      });
      expect(reportedServiceError).toBeInstanceOf(ServiceError);
      let errorRecord = Object.getOwnPropertyDescriptor(reportedServiceError!, 'error')
        ?.value as { data: unknown } | undefined;
      expect(typeof errorRecord).toBe('function');
      for (let artifact of [
        response,
        runtime.logs,
        reported,
        Object.getOwnPropertyDescriptors(reportedServiceError!),
        errorRecord?.data,
        reportedServiceError!.data,
        reportedServiceError!.toResponse()
      ]) {
        let serialized = JSON.stringify(artifact);
        expect(serialized).not.toContain(runtime.sentinel);
        expect(serialized).not.toContain(runtime.authSentinel);
      }
      expect(reportedServiceError!.data).toMatchObject({
        status: 400,
        code: 'invalid_data'
      });
      expect(runtime.cleared).toHaveBeenCalledOnce();
    } finally {
      logSpy.mockRestore();
      errorSpy.mockRestore();
    }
  });

  it('sanitizes ordinary errors and callable data without executing functions or getters', async () => {
    let captured: unknown[][] = [];
    let logSpy = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      captured.push(['log', ...args]);
    });
    let errorSpy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      captured.push(['error', ...args]);
    });
    try {
      let runtime = await createRuntime({
        exerciseSanitizerSafety: true,
        throwSanitizerCallable: true
      });
      let response = await SlatesProviderProtoHandlerManager.handleInput(
        runtime.manager,
        runtime.request
      );
      let callableArtifact = captured.find(entry => entry[0] === 'log')?.[1];
      let errorArtifact = captured.find(entry => entry[0] === 'error')?.[1] as
        | (Error & { callable?: unknown; cause?: unknown })
        | undefined;

      expect(response).toHaveProperty('error');
      expect(runtime.arbitraryExecution).not.toHaveBeenCalled();
      expect(typeof callableArtifact).toBe('object');
      expect(errorArtifact).toBeInstanceOf(Error);
      expect(typeof errorArtifact?.callable).toBe('object');
      expect(JSON.stringify([response, runtime.logs, captured])).not.toContain(
        runtime.sentinel
      );
      expect(JSON.stringify([response, runtime.logs, captured])).not.toContain(
        runtime.authSentinel
      );
      expect(JSON.stringify(captured)).toContain('[redacted]');
      expect(runtime.cleared).toHaveBeenCalledOnce();
    } finally {
      logSpy.mockRestore();
      errorSpy.mockRestore();
    }
  });

  it('redacts direct console, provider logs, HTTP traces, and the FunctionBay response at the redeemed boundary', async () => {
    let capturedConsole: unknown[][] = [];
    let consoleMethods = ['log', 'info', 'warn'] as const;
    let originalMethods = Object.fromEntries(
      consoleMethods.map(name => [name, console[name]])
    ) as Record<(typeof consoleMethods)[number], (...args: any[]) => void>;
    let spies = consoleMethods.map(name =>
      vi.spyOn(console, name).mockImplementation((...args: unknown[]) => {
        capturedConsole.push([name, ...args]);
      })
    );

    try {
      let runtime = await createRuntime({ exerciseLeakChannels: true });
      let installedSpies = Object.fromEntries(
        consoleMethods.map(name => [name, console[name]])
      ) as Record<(typeof consoleMethods)[number], (...args: any[]) => void>;
      let response = await SlatesProviderProtoHandlerManager.handleInput(
        runtime.manager,
        runtime.request
      );
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(response).toHaveProperty('result');
      expect(console.log).toBe(installedSpies.log);
      expect(console.info).toBe(installedSpies.info);
      expect(console.warn).toBe(installedSpies.warn);
      for (let artifact of [response, runtime.logs, capturedConsole]) {
        let serialized = JSON.stringify(artifact);
        expect(serialized).not.toContain(runtime.sentinel);
        expect(serialized).not.toContain(runtime.authSentinel);
      }
      expect(JSON.stringify(response)).toContain('[redacted]');
      expect(JSON.stringify(runtime.logs)).toContain('[redacted]');
      expect(JSON.stringify(capturedConsole)).toContain('[redacted]');
      expect(runtime.cleared).toHaveBeenCalledOnce();
    } finally {
      spies.forEach(spy => spy.mockRestore());
      expect(console.log).toBe(originalMethods.log);
      expect(console.info).toBe(originalMethods.info);
      expect(console.warn).toBe(originalMethods.warn);
    }
  });

  it.each([
    'log',
    'throw'
  ] as const)('installs exact-value redaction before an auth schema refinement can %s a secret', async authRefinement => {
    let captured: unknown[][] = [];
    let logSpy = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      captured.push(['log', ...args]);
    });
    let errorSpy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      captured.push(['error', ...args]);
    });
    try {
      let runtime = await createRuntime({ authRefinement });
      let response = await SlatesProviderProtoHandlerManager.handleInput(
        runtime.manager,
        runtime.request
      );
      await new Promise(resolve => setTimeout(resolve, 20));
      expect(response).toHaveProperty(authRefinement === 'throw' ? 'error' : 'result');
      for (let artifact of [response, runtime.logs, captured]) {
        let serialized = JSON.stringify(artifact);
        expect(serialized).not.toContain(runtime.sentinel);
        expect(serialized).not.toContain(runtime.authSentinel);
      }
      expect(JSON.stringify(captured)).toContain('[redacted]');
      expect(runtime.cleared).toHaveBeenCalledOnce();
    } finally {
      logSpy.mockRestore();
      errorSpy.mockRestore();
    }
  });

  it('sanitizes a malformed classified JSON error before reporting it', async () => {
    let malformedSecret = 'task10secret';
    expect(() => JSON.parse(malformedSecret)).toThrow(malformedSecret);
    let reported: unknown[][] = [];
    let errorSpy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      reported.push(args);
    });
    try {
      let runtime = await createRuntime({
        configSentinel: malformedSecret,
        configSecretPayload: malformedSecret
      });
      let response = await SlatesProviderProtoHandlerManager.handleInput(
        runtime.manager,
        runtime.request
      );
      expect(response).toHaveProperty('error');
      expect(JSON.stringify(response)).not.toContain(malformedSecret);
      expect(JSON.stringify(reported)).not.toContain(malformedSecret);
      expect(runtime.cleared).toHaveBeenCalledOnce();
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('isolates exact-value console redaction across overlapping invocations', async () => {
    let captured: unknown[][] = [];
    let consoleMethods = ['log', 'info', 'warn'] as const;
    let spies = consoleMethods.map(name =>
      vi.spyOn(console, name).mockImplementation((...args: unknown[]) => {
        captured.push([name, ...args]);
      })
    );
    try {
      let first = await createRuntime({
        configSentinel: 'first-config-secret',
        authSentinel: 'first-auth-secret',
        exerciseLeakChannels: true,
        providerDelayMs: 15
      });
      let second = await createRuntime({
        configSentinel: 'second-config-secret',
        authSentinel: 'second-auth-secret',
        exerciseLeakChannels: true,
        providerDelayMs: 15
      });
      let responses = await Promise.all([
        SlatesProviderProtoHandlerManager.handleInput(first.manager, first.request),
        SlatesProviderProtoHandlerManager.handleInput(second.manager, second.request)
      ]);
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(responses.every(response => 'result' in response!)).toBe(true);
      for (let secret of [
        first.sentinel,
        first.authSentinel,
        second.sentinel,
        second.authSentinel
      ]) {
        expect(JSON.stringify([responses, first.logs, second.logs, captured])).not.toContain(
          secret
        );
      }
      expect(JSON.stringify(captured)).toContain('[redacted]');
      expect(first.cleared).toHaveBeenCalledOnce();
      expect(second.cleared).toHaveBeenCalledOnce();
    } finally {
      spies.forEach(spy => spy.mockRestore());
    }
  });

  it.each([
    ['classified JSON parsing', { configSecretPayload: '{not-json' }],
    ['scoped auth shape validation', { authSecretPayload: JSON.stringify('not-an-object') }],
    ['auth schema validation', { authSecretPayload: JSON.stringify({ token: 123 }) }],
    ['provider output validation', { invalidOutput: true }],
    ['provider timeout', { providerDelayMs: 10, operationTimeoutMs: 1 }]
  ] as const)('clears exactly once after %s failure', async (_name, options) => {
    let runtime = await createRuntime(options);
    let response = await SlatesProviderProtoHandlerManager.handleInput(
      runtime.manager,
      runtime.request
    );
    expect(response).toHaveProperty('error');
    expect(runtime.cleared).toHaveBeenCalledOnce();
  });

  it('clears exactly once when the operation is cancelled', async () => {
    let controller = new AbortController();
    controller.abort(new Error('cancelled'));
    let runtime = await createRuntime({
      providerDelayMs: 1,
      operationSignal: controller.signal
    });
    let response = await SlatesProviderProtoHandlerManager.handleInput(
      runtime.manager,
      runtime.request
    );
    expect(response).toHaveProperty('error');
    expect(runtime.cleared).toHaveBeenCalledOnce();
  });
});
