import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { twilioSendGridServiceError } from '../lib/errors';
import { spec } from '../spec';

export let getSuppressions = SlateTool.create(spec, {
  name: 'Get Suppressions',
  key: 'get_suppressions',
  description: `Retrieve email suppressions from SendGrid, including bounces, blocks, spam reports, invalid emails, and global/group unsubscribes. Use the **type** parameter to select which suppression category to query.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      type: z
        .enum([
          'bounces',
          'blocks',
          'spam_reports',
          'invalid_emails',
          'global_unsubscribes',
          'group_unsubscribes'
        ])
        .describe('Type of suppression to retrieve'),
      groupId: z
        .number()
        .optional()
        .describe('Suppression group ID (required for group_unsubscribes)'),
      startTime: z.number().optional().describe('Unix timestamp to filter results from'),
      endTime: z.number().optional().describe('Unix timestamp to filter results until'),
      limit: z.number().optional().describe('Maximum number of results to return'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      suppressions: z
        .array(
          z.object({
            email: z.string().describe('Suppressed email address'),
            reason: z.string().optional().describe('Reason for suppression'),
            status: z.string().optional().describe('Bounce status code'),
            createdAt: z
              .number()
              .optional()
              .describe('Unix timestamp when suppression was created')
          })
        )
        .describe('Suppressed email entries')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    let results: any[];

    switch (ctx.input.type) {
      case 'bounces':
        results = await client.getBounces(
          ctx.input.startTime,
          ctx.input.endTime,
          ctx.input.limit,
          ctx.input.offset
        );
        break;
      case 'blocks':
        results = await client.getBlocks(
          ctx.input.startTime,
          ctx.input.endTime,
          ctx.input.limit,
          ctx.input.offset
        );
        break;
      case 'spam_reports':
        results = await client.getSpamReports(
          ctx.input.startTime,
          ctx.input.endTime,
          ctx.input.limit,
          ctx.input.offset
        );
        break;
      case 'invalid_emails':
        results = await client.getInvalidEmails(
          ctx.input.startTime,
          ctx.input.endTime,
          ctx.input.limit,
          ctx.input.offset
        );
        break;
      case 'global_unsubscribes':
        results = await client.getGlobalSuppressions(
          ctx.input.startTime,
          ctx.input.endTime,
          ctx.input.limit,
          ctx.input.offset
        );
        break;
      case 'group_unsubscribes':
        if (!ctx.input.groupId) {
          throw twilioSendGridServiceError('groupId is required for group_unsubscribes.');
        }
        results = await client.getGroupSuppressions(ctx.input.groupId);
        break;
      default:
        results = [];
    }

    let suppressions = (Array.isArray(results) ? results : []).map((s: any) => ({
      email: s.email,
      reason: s.reason || undefined,
      status: s.status ? String(s.status) : undefined,
      createdAt: s.created || s.created_at || undefined
    }));

    return {
      output: { suppressions },
      message: `Retrieved **${suppressions.length}** ${ctx.input.type.replace(/_/g, ' ')} suppression(s).`
    };
  })
  .build();

export let addSuppression = SlateTool.create(spec, {
  name: 'Add Suppression',
  key: 'add_suppression',
  description: `Add email addresses to a global or group suppression list. Suppressed addresses will not receive emails tagged with the corresponding unsubscribe group (or any emails for global suppressions).`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      scope: z
        .enum(['global', 'group'])
        .describe('Whether to add to global suppressions or a specific group'),
      groupId: z
        .number()
        .optional()
        .describe('Suppression group ID (required when scope is "group")'),
      emails: z.array(z.string()).describe('Email addresses to suppress')
    })
  )
  .output(
    z.object({
      emails: z.array(z.string()).describe('Email addresses that were suppressed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });

    if (ctx.input.scope === 'global') {
      let result = await client.addGlobalSuppression(ctx.input.emails);
      return {
        output: { emails: result.recipient_emails || ctx.input.emails },
        message: `Added **${ctx.input.emails.length}** email(s) to global suppressions.`
      };
    } else {
      if (!ctx.input.groupId) {
        throw twilioSendGridServiceError('groupId is required for group suppressions.');
      }
      let result = await client.addGroupSuppression(ctx.input.groupId, ctx.input.emails);
      return {
        output: { emails: result.recipient_emails || ctx.input.emails },
        message: `Added **${ctx.input.emails.length}** email(s) to suppression group ${ctx.input.groupId}.`
      };
    }
  })
  .build();

export let removeSuppression = SlateTool.create(spec, {
  name: 'Remove Suppression',
  key: 'remove_suppression',
  description: `Remove an email address from a global or group suppression list, allowing it to receive emails again.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      scope: z
        .enum(['global', 'group'])
        .describe('Whether to remove from global suppressions or a specific group'),
      groupId: z
        .number()
        .optional()
        .describe('Suppression group ID (required when scope is "group")'),
      email: z.string().describe('Email address to unsuppress')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the suppression was removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });

    if (ctx.input.scope === 'global') {
      await client.removeGlobalSuppression(ctx.input.email);
    } else {
      if (!ctx.input.groupId) {
        throw twilioSendGridServiceError('groupId is required for group suppressions.');
      }
      await client.removeGroupSuppression(ctx.input.groupId, ctx.input.email);
    }

    return {
      output: { success: true },
      message: `Removed **${ctx.input.email}** from ${ctx.input.scope === 'global' ? 'global' : `group ${ctx.input.groupId}`} suppressions.`
    };
  })
  .build();

export let getSuppressionGroups = SlateTool.create(spec, {
  name: 'Get Suppression Groups',
  key: 'get_suppression_groups',
  description: `List all unsubscribe/suppression groups configured in your SendGrid account. Groups allow recipients to unsubscribe from specific types of emails rather than all emails.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      groups: z
        .array(
          z.object({
            groupId: z.number().describe('Suppression group ID'),
            name: z.string().describe('Group name'),
            description: z.string().describe('Group description'),
            isDefault: z.boolean().optional().describe('Whether this is the default group'),
            unsubscribes: z.number().optional().describe('Number of unsubscribed addresses')
          })
        )
        .describe('Suppression groups')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    let results = await client.getSuppressionGroups();

    let groups = (Array.isArray(results) ? results : []).map((g: any) => ({
      groupId: g.id,
      name: g.name,
      description: g.description,
      isDefault: g.is_default || undefined,
      unsubscribes: g.unsubscribes || undefined
    }));

    return {
      output: { groups },
      message: `Retrieved **${groups.length}** suppression group(s).`
    };
  })
  .build();
