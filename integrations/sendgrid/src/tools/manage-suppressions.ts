import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

// ── Suppression Groups ──

let suppressionGroupSchema = z.object({
  groupId: z.number().describe('Suppression group ID'),
  name: z.string().describe('Group name'),
  description: z.string().describe('Group description shown to recipients'),
  isDefault: z.boolean().describe('Whether this is the default suppression group'),
  unsubscribes: z.number().optional().describe('Number of unsubscribed emails in this group')
});

export let listSuppressionGroups = SlateTool.create(spec, {
  name: 'List Suppression Groups',
  key: 'list_suppression_groups',
  description: `Retrieve all suppression (unsubscribe) groups. These groups allow recipients to opt out of specific email categories while still receiving others.`,
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      groups: z.array(suppressionGroupSchema).describe('Suppression groups')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    let groups = await client.listSuppressionGroups();

    return {
      output: {
        groups: (groups || []).map((g: any) => ({
          groupId: g.id,
          name: g.name,
          description: g.description,
          isDefault: g.is_default,
          unsubscribes: g.unsubscribes
        }))
      },
      message: `Found **${(groups || []).length}** suppression group(s).`
    };
  });

export let getSuppressionGroup = SlateTool.create(spec, {
  name: 'Get Suppression Group',
  key: 'get_suppression_group',
  description: `Retrieve a single suppression (unsubscribe) group by ID, including its default status and unsubscribe count.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      groupId: z.number().describe('Suppression group ID')
    })
  )
  .output(suppressionGroupSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    let g = await client.getSuppressionGroup(ctx.input.groupId);

    return {
      output: {
        groupId: g.id,
        name: g.name,
        description: g.description,
        isDefault: g.is_default,
        unsubscribes: g.unsubscribes
      },
      message: `Retrieved suppression group **${g.name}** (ID: ${g.id}).`
    };
  });

export let createSuppressionGroup = SlateTool.create(spec, {
  name: 'Create Suppression Group',
  key: 'create_suppression_group',
  description: `Create a new suppression (unsubscribe) group. Recipients can unsubscribe from specific groups to control which types of emails they receive.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      name: z.string().describe('Name for the suppression group'),
      description: z
        .string()
        .describe('Description shown to recipients in unsubscribe preferences'),
      isDefault: z.boolean().optional().describe('Set as the default suppression group')
    })
  )
  .output(
    z.object({
      groupId: z.number().describe('Created suppression group ID'),
      name: z.string().describe('Group name'),
      description: z.string().describe('Group description'),
      isDefault: z.boolean().describe('Whether this is the default group')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    let g = await client.createSuppressionGroup(
      ctx.input.name,
      ctx.input.description,
      ctx.input.isDefault
    );

    return {
      output: {
        groupId: g.id,
        name: g.name,
        description: g.description,
        isDefault: g.is_default
      },
      message: `Created suppression group **${g.name}** (ID: ${g.id}).`
    };
  });

export let updateSuppressionGroup = SlateTool.create(spec, {
  name: 'Update Suppression Group',
  key: 'update_suppression_group',
  description: `Update a suppression (unsubscribe) group's name, description, or default status.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      groupId: z.number().describe('Suppression group ID'),
      name: z.string().optional().describe('New group name'),
      description: z
        .string()
        .optional()
        .describe('New description shown to recipients in unsubscribe preferences'),
      isDefault: z.boolean().optional().describe('Set as the default suppression group')
    })
  )
  .output(suppressionGroupSchema)
  .handleInvocation(async ctx => {
    if (
      ctx.input.name === undefined &&
      ctx.input.description === undefined &&
      ctx.input.isDefault === undefined
    ) {
      throw createApiServiceError(
        'Provide at least one of name, description, or isDefault when updating a suppression group.'
      );
    }

    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    let g = await client.updateSuppressionGroup(ctx.input.groupId, {
      name: ctx.input.name,
      description: ctx.input.description,
      isDefault: ctx.input.isDefault
    });

    return {
      output: {
        groupId: g.id,
        name: g.name,
        description: g.description,
        isDefault: g.is_default,
        unsubscribes: g.unsubscribes
      },
      message: `Updated suppression group **${g.name}** (ID: ${g.id}).`
    };
  });

export let deleteSuppressionGroup = SlateTool.create(spec, {
  name: 'Delete Suppression Group',
  key: 'delete_suppression_group',
  description: `Delete a suppression (unsubscribe) group by ID.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      groupId: z.number().describe('Suppression group ID')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    await client.deleteSuppressionGroup(ctx.input.groupId);

    return {
      output: { deleted: true },
      message: `Deleted suppression group ${ctx.input.groupId}.`
    };
  });

// ── Suppression Management ──

export let addSuppressedEmails = SlateTool.create(spec, {
  name: 'Add Suppressed Emails',
  key: 'add_suppressed_emails',
  description: `Add email addresses to a suppression group or the global unsubscribe list. Suppressed emails will not receive emails for the specified group (or all emails if global).`,
  tags: { destructive: false }
})
  .input(
    z.object({
      emails: z.array(z.string()).min(1).describe('Email addresses to suppress'),
      groupId: z
        .number()
        .optional()
        .describe('Suppression group ID. If omitted, adds to global unsubscribe list.')
    })
  )
  .output(
    z.object({
      recipientEmails: z.array(z.string()).describe('Email addresses that were suppressed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });

    let result: any;
    if (ctx.input.groupId) {
      result = await client.addSuppressedEmails(ctx.input.groupId, ctx.input.emails);
    } else {
      result = await client.addGlobalSuppression(ctx.input.emails);
    }

    return {
      output: {
        recipientEmails: result.recipient_emails || ctx.input.emails
      },
      message: ctx.input.groupId
        ? `Added **${ctx.input.emails.length}** email(s) to suppression group ${ctx.input.groupId}.`
        : `Added **${ctx.input.emails.length}** email(s) to global unsubscribe list.`
    };
  });

export let removeSuppressedEmail = SlateTool.create(spec, {
  name: 'Remove Suppressed Email',
  key: 'remove_suppressed_email',
  description: `Remove an email address from a suppression group or the global unsubscribe list. Also supports removing bounces, blocks, spam reports, and invalid emails.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      email: z.string().describe('Email address to remove from suppression'),
      suppressionType: z
        .enum(['group', 'global', 'bounce', 'block', 'spam_report', 'invalid_email'])
        .describe('Type of suppression to remove'),
      groupId: z
        .number()
        .optional()
        .describe('Suppression group ID (required when type is "group")')
    })
  )
  .output(
    z.object({
      removed: z.boolean().describe('Whether removal was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });

    switch (ctx.input.suppressionType) {
      case 'group':
        if (!ctx.input.groupId)
          throw createApiServiceError('groupId is required when suppressionType is "group".');
        await client.deleteSuppressedEmail(ctx.input.groupId, ctx.input.email);
        break;
      case 'global':
        await client.deleteGlobalSuppression(ctx.input.email);
        break;
      case 'bounce':
        await client.deleteBounce(ctx.input.email);
        break;
      case 'block':
        await client.deleteBlock(ctx.input.email);
        break;
      case 'spam_report':
        await client.deleteSpamReport(ctx.input.email);
        break;
      case 'invalid_email':
        await client.deleteInvalidEmail(ctx.input.email);
        break;
    }

    return {
      output: { removed: true },
      message: `Removed \`${ctx.input.email}\` from ${ctx.input.suppressionType.replace('_', ' ')} list.`
    };
  });

// ── List Suppressions ──

export let listSuppressions = SlateTool.create(spec, {
  name: 'List Suppressions',
  key: 'list_suppressions',
  description: `Retrieve suppressed email addresses by type: bounces, blocks, spam reports, invalid emails, global unsubscribes, or group suppressions. Helps you audit your suppression lists and maintain sender reputation.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      suppressionType: z
        .enum([
          'bounces',
          'blocks',
          'spam_reports',
          'invalid_emails',
          'global_unsubscribes',
          'group'
        ])
        .describe('Type of suppression to list'),
      groupId: z
        .number()
        .optional()
        .describe('Suppression group ID (required when type is "group")'),
      startTime: z.number().optional().describe('Start of time range as Unix timestamp'),
      endTime: z.number().optional().describe('End of time range as Unix timestamp')
    })
  )
  .output(
    z.object({
      suppressions: z
        .array(
          z.object({
            email: z.string().describe('Suppressed email address'),
            reason: z.string().optional().describe('Reason for suppression'),
            status: z.string().optional().describe('Suppression status code'),
            createdAt: z
              .number()
              .optional()
              .describe('When the suppression was created (Unix timestamp)')
          })
        )
        .describe('Suppressed email entries')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });

    let items: any[];
    switch (ctx.input.suppressionType) {
      case 'bounces':
        items = await client.listBounces(ctx.input.startTime, ctx.input.endTime);
        break;
      case 'blocks':
        items = await client.listBlocks(ctx.input.startTime, ctx.input.endTime);
        break;
      case 'spam_reports':
        items = await client.listSpamReports(ctx.input.startTime, ctx.input.endTime);
        break;
      case 'invalid_emails':
        items = await client.listInvalidEmails(ctx.input.startTime, ctx.input.endTime);
        break;
      case 'global_unsubscribes':
        items = await client.listGlobalSuppressions(ctx.input.startTime, ctx.input.endTime);
        break;
      case 'group':
        if (!ctx.input.groupId)
          throw createApiServiceError('groupId is required when suppressionType is "group".');
        items = await client.listSuppressedEmails(ctx.input.groupId);
        break;
      default:
        items = [];
    }

    let suppressions = (items || []).map((item: any) => ({
      email: item.email || item,
      reason: item.reason,
      status: item.status ? String(item.status) : undefined,
      createdAt: item.created
    }));

    return {
      output: { suppressions },
      message: `Found **${suppressions.length}** ${ctx.input.suppressionType.replace('_', ' ')} suppression(s).`
    };
  });
