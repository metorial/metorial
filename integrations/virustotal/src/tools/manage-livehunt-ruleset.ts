import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageLivehuntRuleset = SlateTool.create(spec, {
  name: 'Manage Livehunt Ruleset',
  key: 'manage_livehunt_ruleset',
  description: `Create, update, enable/disable, or delete Livehunt YARA rulesets. Livehunt hooks into the stream of files submitted to VirusTotal and generates notifications when YARA rules match. **Premium feature.**`,
  constraints: [
    'This feature requires a VirusTotal Premium API key.',
    'The notification limit configures the max notifications per ruleset in any 24-hour period.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete', 'get', 'list'])
        .describe('Operation to perform'),
      rulesetId: z
        .string()
        .optional()
        .describe('Ruleset ID (required for update, delete, get)'),
      name: z.string().optional().describe('Ruleset name (for create/update)'),
      rules: z.string().optional().describe('YARA rules content (for create/update)'),
      enabled: z
        .boolean()
        .optional()
        .describe('Whether the ruleset is active (for create/update)'),
      notificationLimit: z
        .number()
        .optional()
        .describe('Max notifications per 24 hours (for create/update)'),
      notificationEmails: z
        .array(z.string())
        .optional()
        .describe('Emails for notifications (for create/update)'),
      limit: z.number().optional().default(10).describe('Max items for list action'),
      cursor: z.string().optional().describe('Pagination cursor for list action')
    })
  )
  .output(
    z.object({
      ruleset: z
        .object({
          rulesetId: z.string().describe('Ruleset ID'),
          name: z.string().optional().describe('Ruleset name'),
          rules: z.string().optional().describe('YARA rules content'),
          enabled: z.boolean().optional().describe('Whether the ruleset is active'),
          notificationLimit: z.number().optional().describe('Max notifications per 24 hours'),
          creationDate: z.string().optional().describe('Creation date (Unix timestamp)'),
          modificationDate: z
            .string()
            .optional()
            .describe('Last modification date (Unix timestamp)')
        })
        .optional()
        .describe('Ruleset details (for get/create/update)'),
      rulesets: z
        .array(
          z.object({
            rulesetId: z.string().describe('Ruleset ID'),
            name: z.string().optional().describe('Ruleset name'),
            enabled: z.boolean().optional().describe('Whether the ruleset is active'),
            ruleCount: z.number().optional().describe('Number of rules'),
            creationDate: z.string().optional().describe('Creation date (Unix timestamp)')
          })
        )
        .optional()
        .describe('List of rulesets (for list action)'),
      deleted: z
        .boolean()
        .optional()
        .describe('Whether the ruleset was deleted (for delete action)'),
      nextCursor: z.string().optional().describe('Cursor for next page (for list action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    switch (ctx.input.action) {
      case 'create': {
        if (!ctx.input.name || !ctx.input.rules) {
          throw new Error('Name and rules are required when creating a Livehunt ruleset.');
        }
        let result = await client.createLivehuntRuleset(
          ctx.input.name,
          ctx.input.rules,
          ctx.input.enabled ?? true,
          ctx.input.notificationLimit,
          ctx.input.notificationEmails
        );
        let attrs = result?.attributes ?? {};
        return {
          output: {
            ruleset: {
              rulesetId: result?.id ?? '',
              name: attrs.name,
              rules: attrs.rules,
              enabled: attrs.enabled,
              notificationLimit: attrs.limit,
              creationDate: attrs.creation_date?.toString(),
              modificationDate: attrs.modification_date?.toString()
            }
          },
          message: `Livehunt ruleset **${attrs.name}** created successfully.`
        };
      }
      case 'update': {
        if (!ctx.input.rulesetId) {
          throw new Error('Ruleset ID is required for update.');
        }
        let result = await client.updateLivehuntRuleset(ctx.input.rulesetId, {
          name: ctx.input.name,
          rules: ctx.input.rules,
          enabled: ctx.input.enabled,
          limit: ctx.input.notificationLimit,
          notificationEmails: ctx.input.notificationEmails
        });
        let attrs = result?.attributes ?? {};
        return {
          output: {
            ruleset: {
              rulesetId: result?.id ?? '',
              name: attrs.name,
              rules: attrs.rules,
              enabled: attrs.enabled,
              notificationLimit: attrs.limit,
              creationDate: attrs.creation_date?.toString(),
              modificationDate: attrs.modification_date?.toString()
            }
          },
          message: `Livehunt ruleset \`${ctx.input.rulesetId}\` updated successfully.`
        };
      }
      case 'delete': {
        if (!ctx.input.rulesetId) {
          throw new Error('Ruleset ID is required for delete.');
        }
        await client.deleteLivehuntRuleset(ctx.input.rulesetId);
        return {
          output: { deleted: true },
          message: `Livehunt ruleset \`${ctx.input.rulesetId}\` deleted.`
        };
      }
      case 'get': {
        if (!ctx.input.rulesetId) {
          throw new Error('Ruleset ID is required for get.');
        }
        let result = await client.getLivehuntRuleset(ctx.input.rulesetId);
        let attrs = result?.attributes ?? {};
        return {
          output: {
            ruleset: {
              rulesetId: result?.id ?? '',
              name: attrs.name,
              rules: attrs.rules,
              enabled: attrs.enabled,
              notificationLimit: attrs.limit,
              creationDate: attrs.creation_date?.toString(),
              modificationDate: attrs.modification_date?.toString()
            }
          },
          message: `Retrieved Livehunt ruleset **${attrs.name ?? ctx.input.rulesetId}**.`
        };
      }
      case 'list': {
        let result = await client.getLivehuntRulesets(ctx.input.limit, ctx.input.cursor);
        let rulesets = (result?.data ?? []).map((item: any) => ({
          rulesetId: item.id ?? '',
          name: item.attributes?.name,
          enabled: item.attributes?.enabled,
          ruleCount: item.attributes?.number_of_rules,
          creationDate: item.attributes?.creation_date?.toString()
        }));
        return {
          output: {
            rulesets,
            nextCursor: result?.meta?.cursor
          },
          message: `Found **${rulesets.length}** Livehunt rulesets.`
        };
      }
    }
  })
  .build();
