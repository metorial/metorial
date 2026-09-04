import { ServiceError } from '@lowerdeck/error';
import {
  createApiServiceError,
  SlateAuth,
  SlateConfig,
  SlateSpecification,
  SlateTool
} from 'slates';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { importSuperGoogleTools } from './index';

let createSpec = (key: string, configSchema: z.ZodType<any> = z.object({})) =>
  SlateSpecification.create({
    key,
    name: key,
    config: SlateConfig.create(configSchema),
    auth: SlateAuth.create().output(
      z.object({ token: z.string(), authMethod: z.literal('oauth') })
    )
  });

let createSourceTool = (key = 'search_messages') => {
  let sourceSpec = createSpec('gmail');
  let inputSchema = z.object({ query: z.string() });
  let outputSchema = z.object({ id: z.string() });
  let handleInvocation = vi.fn(async () => ({
    output: { id: 'message-1' },
    message: 'Found one message',
    attachments: [
      {
        mimeType: 'text/plain',
        content: { type: 'content' as const, encoding: 'utf-8' as const, content: 'body' }
      }
    ]
  }));
  let tool = SlateTool.create(sourceSpec, {
    key,
    name: 'Search messages',
    description: 'Search a mailbox.',
    instructions: ['Use a narrow query.'],
    constraints: ['Results may be paginated.'],
    tags: { readOnly: true },
    metadata: { family: 'mail' },
    docs: [
      { type: 'docs.action.general', name: 'Search docs', url: 'https://example.com/search' }
    ]
  })
    .input(inputSchema)
    .output(outputSchema)
    .scopes({ AND: [{ OR: ['scope:mail.read'] }] })
    .authMethods(['google_oauth', 'service_account'])
    .handleInvocation(handleInvocation)
    .build();

  return { handleInvocation, inputSchema, outputSchema, sourceSpec, tool };
};

let providerFor = (source: ReturnType<typeof createSourceTool>) => ({
  spec: source.sourceSpec,
  actions: [source.tool]
});

describe('@slates/super-google-tools', () => {
  it('preserves the tool contract and invocation result while rebinding auth and aliases', async () => {
    let source = createSourceTool();
    let aggregateSpec = createSpec('super-booble-1');
    let result = importSuperGoogleTools({
      spec: aggregateSpec,
      sources: [{ integration: 'gmail', provider: providerFor(source) }],
      manifest: [
        {
          sourceIntegration: 'gmail',
          sourceKey: 'search_messages',
          exposedKey: 'gmail_search_messages',
          exposedName: 'Search Gmail messages'
        }
      ]
    });

    let imported = result.tools[0];
    expect(imported?.key).toBe('gmail_search_messages');
    expect(imported?.name).toBe('Search Gmail messages');
    expect(imported?.description).toBe(source.tool.description);
    expect(imported?.instructions).toBe(source.tool.instructions);
    expect(imported?.constraints).toBe(source.tool.constraints);
    expect(imported?.tags).toBe(source.tool.tags);
    expect(imported?.metadata).toBe(source.tool.metadata);
    expect(imported?.docs).toBe(source.tool.docs);
    expect(imported?.scopes).toBe(source.tool.scopes);
    expect(imported?.inputSchema).toBe(source.inputSchema);
    expect(imported?.outputSchema).toBe(source.outputSchema);
    expect(imported?.authMethods).toEqual(['oauth']);

    let invocation = await imported?.handleInvocation({
      input: { query: 'from:example@example.com' },
      auth: { token: 'token', authMethod: 'oauth' },
      config: {}
    } as any);
    expect(invocation).toEqual({
      output: { id: 'message-1' },
      message: 'Found one message',
      attachments: [
        {
          mimeType: 'text/plain',
          content: { type: 'content', encoding: 'utf-8', content: 'body' }
        }
      ]
    });
    expect(source.handleInvocation).toHaveBeenCalledTimes(1);
    expect(result.inventory).toEqual({
      included: [
        {
          sourceIntegration: 'gmail',
          sourceKey: 'search_messages',
          exposedKey: 'gmail_search_messages',
          exposedName: 'Search Gmail messages'
        }
      ],
      renamed: [
        {
          sourceIntegration: 'gmail',
          sourceKey: 'search_messages',
          exposedKey: 'gmail_search_messages',
          exposedName: 'Search Gmail messages',
          sourceName: 'Search messages'
        }
      ],
      omitted: [],
      sourceToolCount: 1,
      importedToolCount: 1
    });
  });

  it('supports aggregate-owned instructions, constraints, and scopes without replacing schemas or handlers', async () => {
    let source = createSourceTool();
    let aggregateScopes = { AND: [{ OR: ['scope:aggregate'] }] };
    let result = importSuperGoogleTools({
      spec: createSpec('super-booble-1'),
      sources: [{ integration: 'gmail', provider: providerFor(source) }],
      manifest: [
        {
          sourceIntegration: 'gmail',
          sourceKey: 'search_messages',
          instructions: ['Use this aggregate-specific workflow.'],
          constraints: ['The aggregate connection determines visibility.'],
          scopes: aggregateScopes
        }
      ]
    });

    let imported = result.tools[0];
    expect(imported?.instructions).toEqual(['Use this aggregate-specific workflow.']);
    expect(imported?.constraints).toEqual(['The aggregate connection determines visibility.']);
    expect(imported?.scopes).toBe(aggregateScopes);
    expect(imported?.inputSchema).toBe(source.inputSchema);
    expect(imported?.outputSchema).toBe(source.outputSchema);

    await imported?.handleInvocation({
      input: { query: 'aggregate' },
      auth: { token: 'token', authMethod: 'oauth' },
      config: {}
    } as any);
    expect(source.handleInvocation).toHaveBeenCalledTimes(1);
  });

  it('excludes triggers and reports explicit omissions deterministically', () => {
    let source = createSourceTool('download_attachment');
    let result = importSuperGoogleTools({
      spec: createSpec('super-booble-1'),
      sources: [
        {
          integration: 'google-chat',
          provider: {
            spec: source.sourceSpec,
            actions: [source.tool, { type: 'trigger', key: 'message_received' } as any]
          }
        }
      ],
      manifest: [
        {
          sourceIntegration: 'google-chat',
          sourceKey: 'download_attachment',
          status: 'omitted',
          reason: 'Requires service-account-only chat.bot access.'
        }
      ]
    });

    expect(result.tools).toEqual([]);
    expect(result.inventory.omitted).toEqual([
      {
        sourceIntegration: 'google-chat',
        sourceKey: 'download_attachment',
        reason: 'Requires service-account-only chat.bot access.'
      }
    ]);
    expect(result.inventory.sourceToolCount).toBe(1);
  });

  it('can clear source auth-method restrictions', () => {
    let source = createSourceTool();
    let result = importSuperGoogleTools({
      spec: createSpec('super-booble-1'),
      sources: [{ integration: 'gmail', provider: providerFor(source) }],
      manifest: [{ sourceIntegration: 'gmail', sourceKey: 'search_messages' }],
      authMethodKey: null
    });

    expect(result.tools[0]?.authMethods).toBeUndefined();
  });

  it('maps source config while preserving the rest of the invocation context', async () => {
    let sourceSpec = createSpec(
      'google-cloud-functions',
      z.object({ region: z.string().min(1) })
    );
    let handleInvocation = vi.fn(async (ctx: any) => ({
      output: {
        id: [ctx.config.region, ctx.input.value, ctx.auth.token, ctx.identity()].join(':')
      },
      message: 'ok'
    }));
    let sourceTool = SlateTool.create(sourceSpec, {
      key: 'get_operation',
      name: 'Get operation'
    })
      .input(z.object({ value: z.string() }))
      .output(z.object({ id: z.string() }))
      .handleInvocation(handleInvocation)
      .build();
    let result = importSuperGoogleTools({
      spec: createSpec('super-booble-3'),
      sources: [
        {
          integration: 'google-cloud-functions',
          provider: { spec: sourceSpec, actions: [sourceTool] },
          mapConfig: config => ({ region: (config as any).cloudFunctionsRegion })
        }
      ],
      manifest: [
        {
          sourceIntegration: 'google-cloud-functions',
          sourceKey: 'get_operation'
        }
      ]
    });
    let context = {
      config: { cloudFunctionsRegion: 'us-central1', cloudSpeechRegion: 'global' },
      input: { value: 'operation-1' },
      auth: { token: 'access-token', authMethod: 'oauth' },
      identity: () => 'same-context'
    };

    await expect(result.tools[0]?.handleInvocation(context as any)).resolves.toEqual({
      output: { id: 'us-central1:operation-1:access-token:same-context' },
      message: 'ok'
    });
    let mappedContext = handleInvocation.mock.calls[0]?.[0];
    expect(mappedContext.config).toEqual({ region: 'us-central1' });
    expect(mappedContext.input).toBe(context.input);
    expect(mappedContext.auth).toBe(context.auth);
  });

  it('rejects invalid mapped config before invoking the source handler', async () => {
    let sourceSpec = createSpec(
      'google-cloud-functions',
      z.object({ region: z.string().min(1) })
    );
    let handleInvocation = vi.fn(async () => ({ output: {}, message: 'ok' }));
    let sourceTool = SlateTool.create(sourceSpec, {
      key: 'get_operation',
      name: 'Get operation'
    })
      .input(z.object({}))
      .output(z.object({}))
      .handleInvocation(handleInvocation)
      .build();
    let result = importSuperGoogleTools({
      spec: createSpec('super-booble-3'),
      sources: [
        {
          integration: 'google-cloud-functions',
          provider: { spec: sourceSpec, actions: [sourceTool] },
          mapConfig: config => ({ region: (config as any).cloudFunctionsRegion })
        }
      ],
      manifest: [{ sourceIntegration: 'google-cloud-functions', sourceKey: 'get_operation' }]
    });

    try {
      await result.tools[0]?.handleInvocation({ config: {}, input: {}, auth: {} } as any);
      throw new TypeError('Expected invocation to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(ServiceError);
      expect(error).toHaveProperty(
        'data.message',
        expect.stringMatching(/google-cloud-functions:get_operation.*config\.region/)
      );
      expect(error).toHaveProperty('data.reason', 'super_google_source_config');
    }
    expect(handleInvocation).not.toHaveBeenCalled();
  });

  it('enforces required source config even when the source has no config mapper', async () => {
    let sourceSpec = createSpec(
      'google-cloud-resource-manager',
      z.object({ projectId: z.string().min(1) })
    );
    let handleInvocation = vi.fn(async () => ({ output: {}, message: 'ok' }));
    let sourceTool = SlateTool.create(sourceSpec, {
      key: 'get_project',
      name: 'Get project'
    })
      .input(z.object({}))
      .output(z.object({}))
      .handleInvocation(handleInvocation)
      .build();
    let result = importSuperGoogleTools({
      spec: createSpec('super-booble-3'),
      sources: [
        {
          integration: 'google-cloud-resource-manager',
          provider: { spec: sourceSpec, actions: [sourceTool] }
        }
      ],
      manifest: [
        { sourceIntegration: 'google-cloud-resource-manager', sourceKey: 'get_project' }
      ]
    });

    await expect(
      result.tools[0]?.handleInvocation({ config: {}, input: {}, auth: {} } as any)
    ).rejects.toHaveProperty(
      'data.message',
      expect.stringMatching(/google-cloud-resource-manager:get_project.*config\.projectId/)
    );
    expect(handleInvocation).not.toHaveBeenCalled();
  });

  it('preserves source ServiceErrors unchanged', async () => {
    let sourceError = createApiServiceError('Use a different mailbox.', {
      reason: 'gmail_validation'
    });
    let sourceSpec = createSpec('gmail');
    let sourceTool = SlateTool.create(sourceSpec, {
      key: 'search_messages',
      name: 'Search messages'
    })
      .input(z.object({}))
      .output(z.object({}))
      .handleInvocation(async () => {
        throw sourceError;
      })
      .build();
    let result = importSuperGoogleTools({
      spec: createSpec('super-booble-1'),
      sources: [
        { integration: 'gmail', provider: { spec: sourceSpec, actions: [sourceTool] } }
      ],
      manifest: [{ sourceIntegration: 'gmail', sourceKey: 'search_messages' }]
    });

    await expect(
      result.tools[0]?.handleInvocation({ config: {}, input: {}, auth: {} } as any)
    ).rejects.toBe(sourceError);
  });

  it('converts unexpected source failures without exposing provider payloads', async () => {
    let sourceSpec = createSpec('gmail');
    let sourceTool = SlateTool.create(sourceSpec, {
      key: 'search_messages',
      name: 'Search messages'
    })
      .input(z.object({}))
      .output(z.object({}))
      .handleInvocation(async () => {
        throw new Error('secret provider payload: access-token-123');
      })
      .build();
    let result = importSuperGoogleTools({
      spec: createSpec('super-booble-1'),
      sources: [
        { integration: 'gmail', provider: { spec: sourceSpec, actions: [sourceTool] } }
      ],
      manifest: [{ sourceIntegration: 'gmail', sourceKey: 'search_messages' }]
    });

    try {
      await result.tools[0]?.handleInvocation({ config: {}, input: {}, auth: {} } as any);
      throw new TypeError('Expected invocation to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(ServiceError);
      expect(error).toHaveProperty(
        'data.message',
        expect.stringMatching(/gmail:search_messages.*unexpected failure/i)
      );
      expect(error).toHaveProperty('data.reason', 'super_google_source_tool_invocation');
      expect((error as any).data.message).not.toMatch(/secret|access-token-123/i);
    }
  });

  it('rejects duplicate aggregate keys with an actionable error', () => {
    let gmail = createSourceTool();
    let chat = createSourceTool();

    expect(() =>
      importSuperGoogleTools({
        spec: createSpec('super-booble-1'),
        sources: [
          { integration: 'gmail', provider: providerFor(gmail) },
          { integration: 'google-chat', provider: providerFor(chat) }
        ],
        manifest: [
          { sourceIntegration: 'gmail', sourceKey: 'search_messages' },
          { sourceIntegration: 'google-chat', sourceKey: 'search_messages' }
        ]
      })
    ).toThrowError(/Add an exposedKey alias/);
  });

  it('rejects missing requested tools and unaccounted source tools', () => {
    let source = createSourceTool();
    let spec = createSpec('super-booble-1');

    expect(() =>
      importSuperGoogleTools({
        spec,
        sources: [{ integration: 'gmail', provider: providerFor(source) }],
        manifest: [{ sourceIntegration: 'gmail', sourceKey: 'missing_tool' }]
      })
    ).toThrowError(/missing source tool/);

    try {
      importSuperGoogleTools({
        spec,
        sources: [{ integration: 'gmail', provider: providerFor(source) }],
        manifest: []
      });
      throw new TypeError('Expected importSuperGoogleTools to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(ServiceError);
      expect(error).toHaveProperty('message', expect.stringMatching(/not accounted for/));
    }
  });

  it('rejects aggregate production IDs that are not under 60 characters', () => {
    let source = createSourceTool();

    expect(() =>
      importSuperGoogleTools({
        spec: createSpec('super-booble-1'),
        sources: [{ integration: 'gmail', provider: providerFor(source) }],
        manifest: [
          {
            sourceIntegration: 'gmail',
            sourceKey: 'search_messages',
            exposedKey: 'x'.repeat(60)
          }
        ]
      })
    ).toThrowError(/must be under 60 characters/);
  });
});
