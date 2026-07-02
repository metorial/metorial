import { SlateTool } from 'slates';
import { z } from 'zod';
import { BrazeClient } from '../lib/client';
import { spec } from '../spec';

export let listCanvases = SlateTool.create(spec, {
  name: 'List Canvases',
  key: 'list_canvases',
  description: `Retrieve a list of Canvases (multi-step journeys) from Braze with their names, IDs, and tags. Supports pagination and filtering by last edit time.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (starts at 0)'),
      includeArchived: z.boolean().optional().describe('Include archived Canvases in results'),
      sortDirection: z.enum(['asc', 'desc']).optional().describe('Sort by creation time'),
      lastEditTimeGt: z
        .string()
        .optional()
        .describe('Filter Canvases edited after this ISO 8601 timestamp')
    })
  )
  .output(
    z.object({
      canvases: z
        .array(
          z.object({
            canvasId: z.string().describe('Canvas ID'),
            name: z.string().describe('Canvas name'),
            tags: z.array(z.string()).optional().describe('Tags associated with the Canvas'),
            lastEdited: z.string().optional().describe('Last edit timestamp')
          })
        )
        .describe('List of Canvases'),
      message: z.string().describe('Response status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BrazeClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    let result = await client.listCanvases({
      page: ctx.input.page,
      includeArchived: ctx.input.includeArchived,
      sortDirection: ctx.input.sortDirection,
      lastEditTimeGt: ctx.input.lastEditTimeGt
    });

    let canvases = (result.canvases ?? []).map((c: any) => ({
      canvasId: c.id,
      name: c.name,
      tags: c.tags,
      lastEdited: c.last_edited
    }));

    return {
      output: {
        canvases,
        message: result.message
      },
      message: `Found **${canvases.length}** Canvas(es)${ctx.input.page !== undefined ? ` (page ${ctx.input.page})` : ''}.`
    };
  })
  .build();

export let getCanvasDetails = SlateTool.create(spec, {
  name: 'Get Canvas Details',
  key: 'get_canvas_details',
  description: `Retrieve detailed information about a specific Braze Canvas, including its steps, variants, schedule, and configuration.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      canvasId: z.string().describe('ID of the Canvas to retrieve details for')
    })
  )
  .output(
    z.object({
      canvasId: z.string().describe('Canvas ID'),
      name: z.string().optional().describe('Canvas name'),
      description: z.string().optional().describe('Canvas description'),
      archived: z.boolean().optional().describe('Whether the Canvas is archived'),
      draft: z.boolean().optional().describe('Whether the Canvas is a draft'),
      tags: z.array(z.string()).optional().describe('Tags on the Canvas'),
      steps: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Canvas steps configuration'),
      variants: z.array(z.record(z.string(), z.any())).optional().describe('Canvas variants'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      firstEntry: z.string().optional().describe('First entry timestamp'),
      lastEntry: z.string().optional().describe('Last entry timestamp'),
      message: z.string().describe('Response status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BrazeClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    let result = await client.getCanvasDetails(ctx.input.canvasId);

    return {
      output: {
        canvasId: ctx.input.canvasId,
        name: result.name,
        description: result.description,
        archived: result.archived,
        draft: result.draft,
        tags: result.tags,
        steps: result.steps,
        variants: result.variants,
        createdAt: result.created_at,
        updatedAt: result.updated_at,
        firstEntry: result.first_entry,
        lastEntry: result.last_entry,
        message: result.message
      },
      message: `Retrieved details for Canvas **${result.name ?? ctx.input.canvasId}**.`
    };
  })
  .build();

export let getCanvasAnalytics = SlateTool.create(spec, {
  name: 'Get Canvas Analytics',
  key: 'get_canvas_analytics',
  description: `Retrieve daily analytics time series for a Braze Canvas, optionally including variant and step breakdowns.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      canvasId: z.string().describe('ID of the Canvas'),
      length: z.number().describe('Number of days of data to return (max 100)'),
      endingAt: z
        .string()
        .optional()
        .describe('End date for the data series in ISO 8601 format'),
      includeVariantBreakdown: z
        .boolean()
        .optional()
        .describe('Include analytics broken down by Canvas variant'),
      includeStepBreakdown: z
        .boolean()
        .optional()
        .describe('Include analytics broken down by Canvas step')
    })
  )
  .output(
    z.object({
      dataSeries: z
        .array(z.record(z.string(), z.any()))
        .describe('Daily Canvas analytics data points'),
      message: z.string().describe('Response status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BrazeClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    let result = await client.getCanvasAnalytics(
      ctx.input.canvasId,
      ctx.input.length,
      ctx.input.endingAt,
      ctx.input.includeVariantBreakdown,
      ctx.input.includeStepBreakdown
    );

    return {
      output: {
        dataSeries: result.data ?? [],
        message: result.message
      },
      message: `Retrieved **${(result.data ?? []).length}** days of analytics for Canvas **${ctx.input.canvasId}**.`
    };
  })
  .build();
