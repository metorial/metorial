import { ServiceError } from '@lowerdeck/error';
import { expectMcpCompatibleToolSchema } from '@slates/test';
import { includeTool } from '@slates/tool-recipes';
import { allOf, SlateAuth, SlateConfig, SlateSpecification, SlateTool } from 'slates';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  formatGoogleUserInfo,
  getCurrentUserRecipe,
  googleIdentityActionScopes,
  googleIdentityApiError,
  googleIdentityScopes
} from './index';

describe('Google Identity recipe', () => {
  it('has an empty MCP-compatible object input and both identity scopes', () => {
    expectMcpCompatibleToolSchema(getCurrentUserRecipe);
    expect(Object.keys(getCurrentUserRecipe.inputSchema.shape)).toEqual([]);
    expect(googleIdentityActionScopes).toEqual({
      AND: [
        { OR: [googleIdentityScopes.userinfoEmail] },
        { OR: [googleIdentityScopes.userinfoProfile] }
      ]
    });
  });

  it('maps profile fields while discarding unrelated provider fields', () => {
    expect(
      formatGoogleUserInfo({
        id: '123',
        email: 'ada@example.com',
        name: 'Ada',
        picture: 'https://example.com/ada.png',
        verified_email: true
      })
    ).toEqual({
      id: '123',
      email: 'ada@example.com',
      name: 'Ada',
      picture: 'https://example.com/ada.png'
    });
    expect(formatGoogleUserInfo({ id: '123' })).toEqual({ id: '123' });
    expect(() => formatGoogleUserInfo({ email: 'ada@example.com' })).toThrow(ServiceError);
  });

  it('converts upstream failures to ServiceError and preserves existing errors', () => {
    const error = googleIdentityApiError({
      response: {
        status: 403,
        data: { error: { message: 'Insufficient authentication scopes' } }
      }
    });
    expect(error).toBeInstanceOf(ServiceError);
    expect(error.data).toMatchObject({
      reason: 'google_identity_api_error',
      upstreamStatus: 403
    });
    expect(error.data.message).toContain('Insufficient authentication scopes');
    expect(googleIdentityApiError(error)).toBe(error);
  });

  it('applies consumer metadata and scope overrides through includeTool', () => {
    const spec = SlateSpecification.create({
      key: 'identity-test',
      name: 'Identity Test',
      description: 'Identity recipe contract',
      metadata: {},
      config: SlateConfig.create(z.object({})),
      auth: SlateAuth.create().output(z.object({ token: z.string() }))
    });
    const scopes = allOf('consumer-email', 'consumer-profile');
    const tool = includeTool({
      spec,
      recipe: getCurrentUserRecipe,
      toolFactory: SlateTool,
      key: 'account',
      name: 'Account',
      description: 'Connected account',
      scopes,
      dependencies: { createClient: () => ({ getCurrentUser: async () => ({ id: '123' }) }) }
    });
    expect(tool.key).toBe('account');
    expect(tool.name).toBe('Account');
    expect(tool.description).toBe('Connected account');
    expect(tool.scopes).toEqual(scopes);
    expect(tool.tags).toMatchObject({ readOnly: true, destructive: false });
    expectMcpCompatibleToolSchema(tool);
  });
});
