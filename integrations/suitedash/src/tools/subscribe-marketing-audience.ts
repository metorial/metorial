import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let subscribeMarketingAudience = SlateTool.create(spec, {
  name: 'Subscribe to Marketing Audience',
  key: 'subscribe_marketing_audience',
  description: `Subscribes one or more contacts to a specific marketing audience in SuiteDash for targeted email campaigns. Use the **Get Metadata** tool to discover available marketing audiences in your account.`,
  instructions: [
    'Use Get Metadata to find the available marketing audience identifiers.',
    'Provide contact UIDs or emails as identifiers for the contacts to subscribe.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contactIdentifiers: z
        .array(z.string())
        .describe('List of contact UIDs or emails to subscribe'),
      audienceIdentifier: z
        .string()
        .describe('Identifier of the marketing audience to subscribe contacts to')
    })
  )
  .output(
    z.object({
      result: z.record(z.string(), z.unknown()).describe('Subscription result from SuiteDash')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      publicId: ctx.auth.publicId,
      secretKey: ctx.auth.secretKey
    });

    let result = await client.subscribeToMarketingAudience({
      contacts: ctx.input.contactIdentifiers,
      audience: ctx.input.audienceIdentifier
    });

    return {
      output: { result },
      message: `Subscribed **${ctx.input.contactIdentifiers.length}** contact(s) to marketing audience **${ctx.input.audienceIdentifier}**.`
    };
  })
  .build();
