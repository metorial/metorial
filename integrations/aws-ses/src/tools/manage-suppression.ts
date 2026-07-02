import { SlateTool } from 'slates';
import { z } from 'zod';
import { SesClient } from '../lib/client';
import { spec } from '../spec';

export let manageSuppression = SlateTool.create(spec, {
  name: 'Manage Suppression List',
  key: 'manage_suppression',
  description: `Manage the account-level suppression list in SES. Add, remove, retrieve, or list suppressed email addresses. Addresses on the suppression list will not receive emails. Addresses can be suppressed due to bounces or complaints.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['add', 'get', 'remove', 'list']).describe('Operation to perform'),
      emailAddress: z
        .string()
        .optional()
        .describe('Email address to suppress or query (required for add/get/remove)'),
      reason: z
        .enum(['BOUNCE', 'COMPLAINT'])
        .optional()
        .describe('Suppression reason (required for "add")'),
      startDate: z.string().optional().describe('ISO 8601 start date filter for "list"'),
      endDate: z.string().optional().describe('ISO 8601 end date filter for "list"'),
      reasons: z
        .array(z.enum(['BOUNCE', 'COMPLAINT']))
        .optional()
        .describe('Filter by suppression reasons for "list"'),
      nextToken: z.string().optional().describe('Pagination token'),
      pageSize: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      emailAddress: z.string().optional(),
      reason: z.string().optional(),
      lastUpdateTime: z.string().optional(),
      attributes: z
        .object({
          messageId: z.string().optional(),
          feedbackId: z.string().optional()
        })
        .optional()
        .describe('Suppression event attributes'),
      suppressedDestinations: z
        .array(
          z.object({
            emailAddress: z.string(),
            reason: z.string(),
            lastUpdateTime: z.string()
          })
        )
        .optional()
        .describe('List of suppressed addresses'),
      nextToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new SesClient({
      accessKeyId: ctx.auth.accessKeyId,
      secretAccessKey: ctx.auth.secretAccessKey,
      sessionToken: ctx.auth.sessionToken,
      region: ctx.config.region
    });

    let { action } = ctx.input;

    if (action === 'add') {
      await client.putSuppressedDestination(ctx.input.emailAddress!, ctx.input.reason!);
      return {
        output: { emailAddress: ctx.input.emailAddress, reason: ctx.input.reason },
        message: `**${ctx.input.emailAddress}** added to suppression list (reason: ${ctx.input.reason}).`
      };
    }

    if (action === 'get') {
      let result = await client.getSuppressedDestination(ctx.input.emailAddress!);
      return {
        output: result,
        message: `**${result.emailAddress}** is suppressed (reason: ${result.reason}, since: ${result.lastUpdateTime}).`
      };
    }

    if (action === 'remove') {
      await client.deleteSuppressedDestination(ctx.input.emailAddress!);
      return {
        output: { emailAddress: ctx.input.emailAddress },
        message: `**${ctx.input.emailAddress}** removed from suppression list.`
      };
    }

    if (action === 'list') {
      let result = await client.listSuppressedDestinations({
        nextToken: ctx.input.nextToken,
        pageSize: ctx.input.pageSize,
        startDate: ctx.input.startDate,
        endDate: ctx.input.endDate,
        reasons: ctx.input.reasons
      });
      return {
        output: {
          suppressedDestinations: result.suppressedDestinations,
          nextToken: result.nextToken
        },
        message: `Found **${result.suppressedDestinations.length}** suppressed address(es).${result.nextToken ? ' More results available.' : ''}`
      };
    }

    return { output: {}, message: 'No action performed.' };
  })
  .build();
