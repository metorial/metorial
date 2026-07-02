import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let suppressionEntrySchema = z.object({
  email: z.string().describe('Suppressed email address'),
  cause: z
    .string()
    .describe(
      'Suppression cause (unsubscribed, temporary_unavailable, permanent_unavailable, complained, blocked)'
    ),
  source: z.string().describe('Suppression source (user, system, subscriber)'),
  isDeletable: z.boolean().describe('Whether this suppression can be deleted'),
  created: z.string().describe('When the suppression was created')
});

// ── Add Suppression ──

export let addSuppression = SlateTool.create(spec, {
  name: 'Add Suppression',
  key: 'add_suppression',
  description: `Add an email address to the suppression list to block it from receiving emails. Specify the cause of suppression (e.g., unsubscribed, complained).`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address to suppress'),
      cause: z
        .enum([
          'unsubscribed',
          'temporary_unavailable',
          'permanent_unavailable',
          'complained',
          'blocked'
        ])
        .describe('Reason for suppression'),
      created: z.string().optional().describe('Custom creation timestamp (ISO 8601)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the suppression was added successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      datacenter: ctx.config.datacenter
    });

    let result = await client.setSuppression({
      email: ctx.input.email,
      cause: ctx.input.cause,
      created: ctx.input.created
    });

    return {
      output: { success: result.status === 'success' },
      message: `Added **${ctx.input.email}** to suppression list with cause **${ctx.input.cause}**.`
    };
  })
  .build();

// ── Get Suppression ──

export let getSuppression = SlateTool.create(spec, {
  name: 'Get Suppression',
  key: 'get_suppression',
  description: `Check suppression status of a specific email address. Returns all suppression records for the address including cause, source, and whether the suppression can be removed.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address to check'),
      allProjects: z.boolean().optional().describe('Check across all projects')
    })
  )
  .output(
    z.object({
      suppressions: z
        .array(suppressionEntrySchema)
        .describe('Suppression records for the email address')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      datacenter: ctx.config.datacenter
    });

    let result = await client.getSuppression({
      email: ctx.input.email,
      allProjects: ctx.input.allProjects
    });

    let suppressions = (result.suppressions ?? []).map(s => ({
      email: s.email,
      cause: s.cause,
      source: s.source,
      isDeletable: s.is_deletable,
      created: s.created
    }));

    return {
      output: { suppressions },
      message:
        suppressions.length > 0
          ? `Found **${suppressions.length}** suppression record(s) for **${ctx.input.email}**: ${suppressions.map(s => s.cause).join(', ')}.`
          : `No suppression records found for **${ctx.input.email}**.`
    };
  })
  .build();

// ── List Suppressions ──

export let listSuppressions = SlateTool.create(spec, {
  name: 'List Suppressions',
  key: 'list_suppressions',
  description: `List suppressed email addresses with optional filtering by cause, source, and date. Returns suppression records with cursor-based pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cause: z
        .enum([
          'unsubscribed',
          'temporary_unavailable',
          'permanent_unavailable',
          'complained',
          'blocked'
        ])
        .optional()
        .describe('Filter by suppression cause'),
      source: z
        .enum(['user', 'system', 'subscriber'])
        .optional()
        .describe('Filter by suppression source'),
      startTime: z
        .string()
        .optional()
        .describe(
          'Filter by creation date (ISO 8601, return records created after this time)'
        ),
      cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      limit: z.number().optional().describe('Maximum number of records to return')
    })
  )
  .output(
    z.object({
      suppressions: z.array(suppressionEntrySchema).describe('Suppression records'),
      cursor: z.string().optional().describe('Cursor for fetching the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      datacenter: ctx.config.datacenter
    });

    let result = await client.listSuppressions({
      cause: ctx.input.cause,
      source: ctx.input.source,
      startTime: ctx.input.startTime,
      cursor: ctx.input.cursor,
      limit: ctx.input.limit
    });

    let suppressions = (result.suppressions ?? []).map(s => ({
      email: s.email,
      cause: s.cause,
      source: s.source,
      isDeletable: s.is_deletable,
      created: s.created
    }));

    return {
      output: {
        suppressions,
        cursor: result.cursor
      },
      message: `Found **${suppressions.length}** suppression record(s).${result.cursor ? ' More results available with cursor.' : ''}`
    };
  })
  .build();

// ── Delete Suppression ──

export let deleteSuppression = SlateTool.create(spec, {
  name: 'Delete Suppression',
  key: 'delete_suppression',
  description: `Remove an email address from the suppression list, allowing it to receive emails again. Only user-deletable suppressions can be removed.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address to remove from suppression list')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the suppression was removed successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      datacenter: ctx.config.datacenter
    });

    let result = await client.deleteSuppression({ email: ctx.input.email });

    return {
      output: { success: result.status === 'success' },
      message: `Removed **${ctx.input.email}** from suppression list.`
    };
  })
  .build();
