import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { googleAdminActionScopes } from '../scopes';
import { spec } from '../spec';

export let manageUserAliases = SlateTool.create(spec, {
  name: 'Manage User Aliases',
  key: 'manage_user_aliases',
  description: `List, add, or remove email aliases for a user. Aliases allow users to send and receive email from additional addresses within the domain.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .scopes(googleAdminActionScopes.manageUserAliases)
  .input(
    z.object({
      userKey: z.string().describe('Email address or unique user ID of the user'),
      action: z.enum(['list', 'add', 'remove']).describe('Action to perform on user aliases'),
      alias: z
        .string()
        .optional()
        .describe('Email alias to add or remove (required for add/remove actions)')
    })
  )
  .output(
    z.object({
      aliases: z
        .array(
          z.object({
            alias: z.string().optional(),
            primaryEmail: z.string().optional(),
            kind: z.string().optional()
          })
        )
        .optional()
        .describe('List of aliases (returned for list action)'),
      addedAlias: z.string().optional().describe('The alias that was added'),
      removedAlias: z.string().optional().describe('The alias that was removed'),
      action: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      customerId: ctx.config.customerId,
      domain: ctx.config.domain
    });

    if (ctx.input.action === 'list') {
      let result = await client.listUserAliases(ctx.input.userKey);
      let aliases = (result.aliases || []).map((a: any) => ({
        alias: a.alias,
        primaryEmail: a.primaryEmail,
        kind: a.kind
      }));

      return {
        output: { aliases, action: 'list' },
        message: `Found **${aliases.length}** aliases for user **${ctx.input.userKey}**.`
      };
    }

    if (!ctx.input.alias) {
      throw new Error('Alias is required for add/remove actions');
    }

    if (ctx.input.action === 'add') {
      await client.createUserAlias(ctx.input.userKey, ctx.input.alias);
      return {
        output: { addedAlias: ctx.input.alias, action: 'add' },
        message: `Added alias **${ctx.input.alias}** to user **${ctx.input.userKey}**.`
      };
    }

    await client.deleteUserAlias(ctx.input.userKey, ctx.input.alias);
    return {
      output: { removedAlias: ctx.input.alias, action: 'remove' },
      message: `Removed alias **${ctx.input.alias}** from user **${ctx.input.userKey}**.`
    };
  })
  .build();
