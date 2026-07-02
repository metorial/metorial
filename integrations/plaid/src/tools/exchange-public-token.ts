import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlaidClient } from '../lib/client';
import { spec } from '../spec';

export let exchangePublicTokenTool = SlateTool.create(spec, {
  name: 'Exchange Public Token',
  key: 'exchange_public_token',
  description: `Exchange a temporary \`public_token\` (received from Plaid Link's onSuccess callback) for a permanent \`access_token\` and \`item_id\`. The public token is single-use and expires after 30 minutes. Store the returned access token securely for subsequent API calls.`
})
  .input(
    z.object({
      publicToken: z.string().describe('Temporary public_token from Plaid Link onSuccess')
    })
  )
  .output(
    z.object({
      accessToken: z.string().describe('Permanent access token for the Item'),
      itemId: z.string().describe('The Plaid Item ID for the new bank connection')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlaidClient({
      clientId: ctx.auth.clientId,
      secret: ctx.auth.secret,
      environment: ctx.config.environment
    });

    let result = await client.exchangePublicToken(ctx.input.publicToken);

    return {
      output: {
        accessToken: result.access_token,
        itemId: result.item_id
      },
      message: `Exchanged public token for Item \`${result.item_id}\`.`
    };
  })
  .build();
