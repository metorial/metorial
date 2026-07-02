import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageSender = SlateTool.create(spec, {
  name: 'Create or Delete Sender',
  key: 'manage_sender',
  description: `Create a new sender identity or delete an existing one for a brand. Senders are email addresses or domains used as the "from" address in campaigns. Set \`action\` to "create" or "delete".`,
  instructions: [
    'Use identityType "domain" for domain-based sending (requires DNS verification).',
    'Use identityType "email" for individual email address senders.',
    'Set shareType to "all" to share the sender across all brands, or "none" for the current brand only.'
  ]
})
  .input(
    z.object({
      brandId: z.string().describe('ID of the brand'),
      action: z.enum(['create', 'delete']).describe('Whether to create or delete a sender'),
      senderId: z
        .string()
        .optional()
        .describe('ID of the sender to delete (required for delete action)'),
      identity: z
        .string()
        .optional()
        .describe('Domain or email address (required for create action)'),
      identityType: z
        .enum(['domain', 'email'])
        .optional()
        .describe('Type of identity (required for create action)'),
      shareType: z
        .enum(['all', 'none'])
        .optional()
        .describe(
          'Whether to share across all brands or just this one (required for create action)'
        )
    })
  )
  .output(
    z.object({
      senderId: z.string().optional().describe('Sender unique identifier'),
      identityType: z.string().optional().describe('Domain or email'),
      identity: z.string().optional().describe('The domain or email address'),
      shareType: z.string().optional().describe('Sharing scope'),
      verified: z.boolean().optional().describe('Whether the sender is verified'),
      bounceVerified: z.boolean().optional().describe('Whether the bounce domain is verified'),
      deleted: z.boolean().optional().describe('Whether the sender was deleted'),
      createdAt: z.string().optional().describe('Creation timestamp (ISO 8601)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    if (ctx.input.action === 'delete') {
      if (!ctx.input.senderId) {
        throw new Error('senderId is required for delete action');
      }
      await client.deleteSender(ctx.input.brandId, ctx.input.senderId);
      return {
        output: { deleted: true },
        message: `Deleted sender **${ctx.input.senderId}** from brand ${ctx.input.brandId}.`
      };
    }

    if (!ctx.input.identity || !ctx.input.identityType || !ctx.input.shareType) {
      throw new Error('identity, identityType, and shareType are required for create action');
    }

    let sender = await client.createSender(ctx.input.brandId, {
      identity: ctx.input.identity,
      identity_type: ctx.input.identityType,
      share_type: ctx.input.shareType
    });

    return {
      output: {
        senderId: sender.id,
        identityType: sender.identity_type,
        identity: sender.identity,
        shareType: sender.share_type,
        verified: sender.verified,
        bounceVerified: sender.bounce_verified,
        createdAt: new Date(sender.created * 1000).toISOString()
      },
      message: `Created sender **${sender.identity}** (${sender.identity_type}, verified: ${sender.verified}).`
    };
  })
  .build();
