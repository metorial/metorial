import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageSupporter = SlateTool.create(spec, {
  name: 'Manage Supporter',
  key: 'manage_supporter',
  description: `Add or remove a supporter (vote) on a suggestion. To add a supporter, provide a **suggestionId**. To remove, provide a **supporterId**. Supporters represent end users who support an idea.`
})
  .input(
    z.object({
      action: z
        .enum(['add', 'remove'])
        .describe('"add" to add a supporter, "remove" to remove one'),
      suggestionId: z
        .number()
        .optional()
        .describe('ID of the suggestion to support (required for "add")'),
      userId: z
        .number()
        .optional()
        .describe(
          'ID of the user to add as supporter (optional for "add"; defaults to authenticated user)'
        ),
      supporterId: z
        .number()
        .optional()
        .describe('ID of the supporter record to remove (required for "remove")')
    })
  )
  .output(
    z.object({
      supporterId: z
        .number()
        .optional()
        .describe('ID of the supporter record (for add actions)'),
      removed: z
        .boolean()
        .optional()
        .describe('Whether the supporter was removed (for remove actions)'),
      suggestionId: z.number().optional().describe('ID of the suggestion')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.auth.subdomain
    });

    if (ctx.input.action === 'add') {
      if (!ctx.input.suggestionId) {
        throw new Error('suggestionId is required when adding a supporter');
      }

      let supporter = await client.createSupporter({
        suggestionId: ctx.input.suggestionId,
        userId: ctx.input.userId
      });

      return {
        output: {
          supporterId: supporter.id,
          suggestionId: ctx.input.suggestionId
        },
        message: `Added supporter to suggestion ${ctx.input.suggestionId}.`
      };
    } else {
      if (!ctx.input.supporterId) {
        throw new Error('supporterId is required when removing a supporter');
      }

      await client.deleteSupporter(ctx.input.supporterId);

      return {
        output: {
          removed: true,
          supporterId: ctx.input.supporterId
        },
        message: `Removed supporter ${ctx.input.supporterId}.`
      };
    }
  })
  .build();
