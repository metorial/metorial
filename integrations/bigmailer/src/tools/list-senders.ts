import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSenders = SlateTool.create(spec, {
  name: 'List Senders',
  key: 'list_senders',
  description: `List sender identities configured for a brand. Returns sender domains/emails, verification status, DNS records, and sharing settings.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      brandId: z.string().describe('ID of the brand'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of senders to return (1-100). Defaults to 10.'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      hasMore: z.boolean().describe('Whether more senders exist beyond this page'),
      cursor: z.string().describe('Cursor for fetching the next page'),
      total: z.number().describe('Total number of senders'),
      senders: z.array(
        z.object({
          senderId: z.string().describe('Sender unique identifier'),
          identityType: z.string().describe('Type: domain or email'),
          identity: z.string().describe('The domain or email address'),
          bounceDomain: z.string().describe('MAIL FROM domain for bounces'),
          shareType: z.string().describe('Sharing scope: all or none'),
          verified: z.boolean().describe('Whether the sender is verified'),
          bounceVerified: z.boolean().describe('Whether the bounce domain is verified'),
          createdAt: z.string().describe('Creation timestamp (ISO 8601)')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.listSenders(ctx.input.brandId, {
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let senders = result.data.map(s => ({
      senderId: s.id,
      identityType: s.identity_type,
      identity: s.identity,
      bounceDomain: s.bounce_domain,
      shareType: s.share_type,
      verified: s.verified,
      bounceVerified: s.bounce_verified,
      createdAt: new Date(s.created * 1000).toISOString()
    }));

    return {
      output: {
        hasMore: result.has_more,
        cursor: result.cursor,
        total: result.total,
        senders
      },
      message: `Found **${result.total}** sender(s). Returned **${senders.length}** sender(s)${result.has_more ? ' (more available)' : ''}.`
    };
  })
  .build();
