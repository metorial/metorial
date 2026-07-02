import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlaidClient } from '../lib/client';
import { spec } from '../spec';

export let createLinkTokenTool = SlateTool.create(spec, {
  name: 'Create Link Token',
  key: 'create_link_token',
  description: `Create a short-lived \`link_token\` used to initialize Plaid Link in a client application. The token expires in 4 hours (or 30 minutes in update mode). Pass the resulting link token to your frontend to open the Plaid Link flow for users to connect their bank accounts.`,
  instructions: [
    'clientName must be 30 characters or fewer.',
    'To update an existing Item (e.g. to fix a broken connection), pass the accessToken parameter instead of products.'
  ]
})
  .input(
    z.object({
      clientName: z.string().describe('Your app name shown during Link (max 30 chars)'),
      language: z.string().default('en').describe('Language code (e.g. en, es, fr)'),
      countryCodes: z
        .array(z.string())
        .default(['US'])
        .describe('ISO 3166-1 alpha-2 country codes'),
      userId: z.string().describe('Unique identifier for the end user in your system'),
      products: z
        .array(z.string())
        .optional()
        .describe('Plaid products to enable (e.g. auth, transactions, identity)'),
      webhook: z.string().optional().describe('Webhook URL to receive Item updates'),
      redirectUri: z
        .string()
        .optional()
        .describe('OAuth redirect URI (required for OAuth institutions)'),
      accessToken: z
        .string()
        .optional()
        .describe('Access token for an existing Item (update mode)')
    })
  )
  .output(
    z.object({
      linkToken: z.string().describe('The link_token to pass to Plaid Link'),
      expiration: z.string().describe('ISO 8601 expiration timestamp for the link token')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlaidClient({
      clientId: ctx.auth.clientId,
      secret: ctx.auth.secret,
      environment: ctx.config.environment
    });

    let result = await client.createLinkToken({
      clientName: ctx.input.clientName,
      language: ctx.input.language,
      countryCodes: ctx.input.countryCodes,
      userId: ctx.input.userId,
      products: ctx.input.products,
      webhook: ctx.input.webhook,
      redirectUri: ctx.input.redirectUri,
      accessToken: ctx.input.accessToken
    });

    return {
      output: {
        linkToken: result.link_token,
        expiration: result.expiration
      },
      message: `Created link token expiring at ${result.expiration}.`
    };
  })
  .build();
