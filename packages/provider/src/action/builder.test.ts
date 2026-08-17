import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { SlateAuth } from '../auth';
import { SlateConfig } from '../config';
import { SlatePublicContext } from '../context';
import { SlateSpecification } from '../specification/specification';
import { SlatePublicTool } from './publicTool';
import { SlateTool } from './tool';

let createTestSpec = () => {
  let config = SlateConfig.create(
    z.object({
      prefix: z.string()
    })
  );
  let auth = SlateAuth.create<{ token: string }>().output(
    z.object({
      token: z.string()
    })
  );

  return SlateSpecification.create({
    key: 'demo',
    name: 'Demo',
    config,
    auth
  });
};

describe('SlateActionBuilder.lockInterface', () => {
  it('prevents changing input and output schemas after the interface is locked', () => {
    let spec = createTestSpec();
    let builder = SlateTool.create(spec, {
      key: 'send',
      name: 'Send'
    })
      .input(z.object({ to: z.string() }))
      .output(z.object({ id: z.string() }))
      .lockInterface();

    expect(() => builder.input(z.object({}))).toThrow(
      'Adapter contract input schema cannot be changed'
    );
    expect(() => builder.output(z.object({}))).toThrow(
      'Adapter contract output schema cannot be changed'
    );
  });
});

describe('SlatePublicTool', () => {
  it('builds a public tool that omits config and auth from the handler context', async () => {
    let spec = createTestSpec();
    let tool = SlatePublicTool.create(spec, {
      key: 'setup',
      name: 'Setup'
    })
      .input(
        z.object({
          name: z.string()
        })
      )
      .output(
        z.object({
          greeting: z.string()
        })
      )
      .handleInvocation(async ctx => {
        expect(ctx).not.toHaveProperty('config');
        expect(ctx).not.toHaveProperty('auth');

        return {
          output: { greeting: `Hello ${ctx.input.name}` },
          message: 'ok'
        };
      })
      .build();

    expect(tool.isPublic).toBe(true);
    expect(tool.key).toBe('setup');

    let result = await tool.handleInvocation(
      new SlatePublicContext({ name: 'Ada' }, spec, {
        debug: () => {},
        error: () => {},
        info: () => {},
        progress: () => {},
        warn: () => {}
      } as any) as any
    );

    expect(result.output).toEqual({ greeting: 'Hello Ada' });
  });

  it('keeps regular tools private by default', () => {
    let spec = createTestSpec();
    let tool = SlateTool.create(spec, {
      key: 'send',
      name: 'Send'
    })
      .input(z.object({}))
      .output(z.object({}))
      .handleInvocation(async () => ({
        output: {},
        message: 'ok'
      }))
      .build();

    expect(tool.isPublic).toBe(false);
  });

  it('rejects authentication methods on public tools', () => {
    let spec = createTestSpec();

    expect(() =>
      SlatePublicTool.create(spec, {
        key: 'setup',
        name: 'Setup'
      }).authMethods(['token_auth'])
    ).toThrow('Public tools cannot require authentication methods');

    expect(() =>
      SlatePublicTool.create(spec, {
        key: 'setup',
        name: 'Setup',
        authMethods: ['token_auth']
      })
        .input(z.object({}))
        .output(z.object({}))
        .handleInvocation(async () => ({
          output: {},
          message: 'ok'
        }))
        .build()
    ).toThrow('Public tools cannot require authentication methods');
  });
});
