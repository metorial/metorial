import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createToken = SlateTool.create(spec, {
  name: 'Create Token',
  key: 'create_token',
  description: `Create a NetLicensing token. Tokens serve different purposes: **SHOP** tokens generate a shop URL for a licensee to purchase licenses, **APIKEY** tokens create API keys with role-based access, and **DEFAULT** tokens are general-purpose.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      tokenType: z.enum(['DEFAULT', 'SHOP', 'APIKEY']).describe('Type of token to create'),
      licenseeNumber: z
        .string()
        .optional()
        .describe('Licensee number. Required for SHOP tokens.'),
      successUrl: z
        .string()
        .optional()
        .describe('URL to redirect to after successful shop purchase'),
      cancelUrl: z
        .string()
        .optional()
        .describe('URL to redirect to if shop purchase is cancelled'),
      apiKeyRole: z
        .string()
        .optional()
        .describe(
          'Role for APIKEY tokens (Licensee, Analytics, Operation, Maintenance, Admin)'
        ),
      expirationTime: z.string().optional().describe('Token expiration timestamp (ISO 8601)')
    })
  )
  .output(
    z.object({
      tokenNumber: z.string().describe('Token number/value'),
      tokenType: z.string().optional().describe('Token type'),
      active: z.boolean().optional().describe('Whether active'),
      expirationTime: z.string().optional().describe('Expiration timestamp'),
      shopUrl: z.string().optional().describe('Shop URL (for SHOP tokens)'),
      vendorNumber: z.string().optional().describe('Vendor number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let params: Record<string, any> = {
      tokenType: ctx.input.tokenType
    };

    if (ctx.input.licenseeNumber) params.licenseeNumber = ctx.input.licenseeNumber;
    if (ctx.input.successUrl) params.successURL = ctx.input.successUrl;
    if (ctx.input.cancelUrl) params.cancelURL = ctx.input.cancelUrl;
    if (ctx.input.apiKeyRole) params.apiKeyRole = ctx.input.apiKeyRole;
    if (ctx.input.expirationTime) params.expirationTime = ctx.input.expirationTime;

    let result = await client.createToken(params);
    if (!result) throw new Error('Failed to create token');

    return {
      output: {
        tokenNumber: result.number,
        tokenType: result.tokenType,
        active: result.active,
        expirationTime: result.expirationTime,
        shopUrl: result.shopURL,
        vendorNumber: result.vendorNumber
      },
      message: `Token **${result.number}** (${result.tokenType}) created.${result.shopURL ? ` Shop URL: ${result.shopURL}` : ''}`
    };
  })
  .build();
