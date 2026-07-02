import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTokens = SlateTool.create(spec, {
  name: 'List Tokens',
  key: 'list_tokens',
  description: `Retrieve all tokens for the current vendor. Includes shop tokens, API keys, and default tokens with their status and expiration details.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      tokens: z
        .array(
          z.object({
            tokenNumber: z.string().describe('Token number/value'),
            tokenType: z.string().optional().describe('Token type (DEFAULT, SHOP, APIKEY)'),
            active: z.boolean().optional().describe('Whether active'),
            expirationTime: z.string().optional().describe('Expiration timestamp'),
            shopUrl: z.string().optional().describe('Shop URL'),
            licenseeNumber: z.string().optional().describe('Associated licensee'),
            vendorNumber: z.string().optional().describe('Vendor number')
          })
        )
        .describe('List of tokens')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let items = await client.listTokens();
    let tokens = items.map(item => ({
      tokenNumber: item.number,
      tokenType: item.tokenType,
      active: item.active,
      expirationTime: item.expirationTime,
      shopUrl: item.shopURL,
      licenseeNumber: item.licenseeNumber,
      vendorNumber: item.vendorNumber
    }));
    return {
      output: { tokens },
      message: `Found **${tokens.length}** token(s).`
    };
  })
  .build();
