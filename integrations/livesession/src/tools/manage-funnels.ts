import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  FUNNEL_CREATE_MUTATION,
  FUNNEL_DELETE_MUTATION,
  FUNNEL_SET_FAVOURITE_MUTATION,
  FUNNEL_UPDATE_MUTATION
} from '../lib/graphql';
import { spec } from '../spec';

let filterDataStringSchema = z
  .object({
    value: z.string().optional().describe('Single value to match'),
    values: z.array(z.string()).optional().describe('Multiple values to match'),
    operator: z
      .string()
      .describe('Comparison operator: equals, contains, starts_with, ends_with, in, not_in')
  })
  .describe('String filter criteria');

let filterDataIntSchema = z
  .object({
    value: z.number().optional().describe('Single integer value'),
    values: z.array(z.number()).optional().describe('Multiple integer values'),
    operator: z
      .string()
      .describe('Comparison operator: equals, greater_than, less_than, in, not_in')
  })
  .describe('Integer filter criteria');

let filterDataBoolSchema = z
  .object({
    value: z.boolean().describe('Boolean value to match'),
    operator: z.string().describe('Comparison operator: equals')
  })
  .describe('Boolean filter criteria');

let filterDataEventSchema = z
  .object({
    type: z.string().describe('Event type: click, page_view, form_submit'),
    group: filterDataStringSchema.optional(),
    element: filterDataStringSchema.optional(),
    txt: filterDataStringSchema.optional(),
    element_path: filterDataStringSchema.optional(),
    location: filterDataStringSchema.optional(),
    value: filterDataStringSchema.optional(),
    height: filterDataIntSchema.optional(),
    width: filterDataIntSchema.optional(),
    timestamp: filterDataIntSchema.optional(),
    x: filterDataIntSchema.optional(),
    y: filterDataIntSchema.optional()
  })
  .describe('Event filter criteria');

let filterDataParamSchema = z
  .object({
    name: z.string().describe('Parameter name (e.g. "utm_source")'),
    value: filterDataStringSchema.optional().describe('Parameter value comparison')
  })
  .describe('Parameter filter criteria');

let filterDataCustomEventPropertySchema = z
  .object({
    name: z.string().optional(),
    string: filterDataStringSchema.optional(),
    int: filterDataIntSchema.optional(),
    bool: filterDataBoolSchema.optional()
  })
  .describe('Custom event property filter');

let filterDataSchema = z
  .object({
    string: filterDataStringSchema.optional(),
    int: filterDataIntSchema.optional(),
    bool: filterDataBoolSchema.optional(),
    event: filterDataEventSchema.optional(),
    param: filterDataParamSchema.optional(),
    event_properties: z.array(filterDataCustomEventPropertySchema).optional()
  })
  .describe('Filter data specification');

let filterSchema = z
  .object({
    name: z.string().describe('Filter name'),
    unit: z.string().optional().describe('Unit (px, ms, %)'),
    group: z.string().optional().describe('Grouping category'),
    data: filterDataSchema.describe('Filter criteria'),
    defined_event_id: z.string().optional().describe('Event type link'),
    stable_id: z.string().optional().describe('Persistent identifier'),
    parent_filter_stable_id: z.string().optional().describe('Parent filter reference')
  })
  .describe('Individual filter definition');

let filtersSchema = z
  .object({
    must: z.array(z.array(filterSchema)).optional().describe('AND logic filters'),
    should: z.array(z.array(filterSchema)).optional().describe('OR logic filters'),
    must_not: z.array(z.array(filterSchema)).optional().describe('NOT logic filters')
  })
  .describe('Filter groups (must=AND, should=OR, must_not=NOT)');

let funnelStepSchema = z
  .object({
    name: z.string().optional().describe('Step display name'),
    filters: filtersSchema.optional().describe('Step completion criteria')
  })
  .describe('Funnel step definition');

let dateRangeSchema = z
  .object({
    from: z
      .string()
      .describe(
        'Start date (relative: TODAY, YESTERDAY, TODAY_MINUS_7_DAYS, TODAY_MINUS_30_DAYS, BEGINNING_OF_WEEK, BEGINNING_OF_MONTH, BEGINNING_OF_PREV_MONTH or absolute ISO 8601)'
      ),
    to: z.string().describe('End date (relative or absolute ISO 8601)')
  })
  .describe('Date range for funnel computation');

let conversionValueSchema = z
  .object({
    property_name: z.string().describe('Property name for conversion tracking'),
    value_type: z.string().describe('Value type: revenue or count'),
    label: z.string().describe('Display label for the conversion value')
  })
  .describe('Conversion value tracking configuration');

let computeInputSchema = z
  .object({
    type: z.string().optional().describe('Computation type: standard or custom'),
    date_range: dateRangeSchema,
    steps: z.array(funnelStepSchema).describe('Funnel steps to define'),
    filters: filtersSchema.optional().describe('Additional global filters'),
    conversion_value: conversionValueSchema.optional().describe('Conversion value tracking')
  })
  .describe('Funnel computation configuration');

let funnelSchema = z.object({
  funnelId: z.string().describe('Unique funnel identifier'),
  name: z.string().optional().describe('Funnel display name'),
  description: z.string().optional().describe('Funnel description'),
  websiteId: z.string().optional().describe('Associated website ID'),
  segmentId: z.string().optional().describe('Associated segment ID'),
  isFavourite: z.boolean().optional().describe('Whether the funnel is marked as favourite'),
  isOwner: z.boolean().optional().describe('Whether the current user owns this funnel'),
  isPublic: z.boolean().optional().describe('Whether the funnel is publicly visible'),
  createdByAgentId: z.string().optional().describe('ID of the agent who created the funnel'),
  createdByLogin: z.string().optional().describe('Login of the user who created the funnel')
});

let mapFunnel = (f: any) => ({
  funnelId: f.funnel_id,
  name: f.name,
  description: f.description,
  websiteId: f.website_id,
  segmentId: f.segment_id,
  isFavourite: f.is_favourite,
  isOwner: f.is_owner,
  isPublic: f.is_public,
  createdByAgentId: f.created_by_agent_id,
  createdByLogin: f.created_by_login
});

export let createFunnel = SlateTool.create(spec, {
  name: 'Create Funnel',
  key: 'create_funnel',
  description: `Create a new conversion funnel in LiveSession via the GraphQL API. Define multi-step funnels with rich filtering to track user conversion paths. Each step supports string, integer, boolean, event, parameter, and custom event property filters.`,
  instructions: [
    'Use relative dates like TODAY, TODAY_MINUS_7_DAYS, BEGINNING_OF_MONTH for convenience.',
    'Each step in the funnel requires filters to define what qualifies as completion of that step.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Funnel display name'),
      description: z.string().optional().describe('Optional funnel description'),
      websiteId: z.string().optional().describe('Target website ID'),
      segmentId: z.string().describe('Associated segment ID'),
      isPublic: z
        .boolean()
        .optional()
        .describe('Whether the funnel should be publicly visible'),
      compute: z
        .array(computeInputSchema)
        .describe('Computation settings with steps, date range, and filters')
    })
  )
  .output(funnelSchema)
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.graphql(FUNNEL_CREATE_MUTATION, {
      input: {
        name: ctx.input.name,
        description: ctx.input.description,
        website_id: ctx.input.websiteId,
        segment_id: ctx.input.segmentId,
        is_public: ctx.input.isPublic,
        compute: ctx.input.compute
      }
    });

    let funnel = mapFunnel(result.data.funnelCreate);
    return {
      output: funnel,
      message: `Created funnel **${funnel.name}** (${funnel.funnelId}).`
    };
  })
  .build();

export let deleteFunnel = SlateTool.create(spec, {
  name: 'Delete Funnel',
  key: 'delete_funnel',
  description: `Permanently delete a conversion funnel from LiveSession.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      funnelId: z.string().describe('ID of the funnel to delete')
    })
  )
  .output(
    z.object({
      funnelId: z.string().describe('ID of the deleted funnel'),
      deleted: z.boolean().describe('Whether the funnel was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.graphql(FUNNEL_DELETE_MUTATION, {
      funnel_id: ctx.input.funnelId
    });

    return {
      output: {
        funnelId: ctx.input.funnelId,
        deleted: result.data.funnelDelete === true
      },
      message: `Deleted funnel **${ctx.input.funnelId}**.`
    };
  })
  .build();

export let updateFunnel = SlateTool.create(spec, {
  name: 'Update Funnel',
  key: 'update_funnel',
  description: `Update an existing conversion funnel's configuration in LiveSession. Modify name, steps, filters, date ranges, and other settings.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      funnelId: z.string().describe('ID of the funnel to update'),
      name: z.string().describe('Updated funnel display name'),
      description: z.string().optional().describe('Updated description'),
      websiteId: z.string().optional().describe('Updated website ID'),
      segmentId: z.string().describe('Updated segment ID'),
      isPublic: z.boolean().optional().describe('Updated public visibility'),
      compute: z.array(computeInputSchema).describe('Updated computation settings')
    })
  )
  .output(funnelSchema)
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.graphql(FUNNEL_UPDATE_MUTATION, {
      funnel_id: ctx.input.funnelId,
      input: {
        name: ctx.input.name,
        description: ctx.input.description,
        website_id: ctx.input.websiteId,
        segment_id: ctx.input.segmentId,
        is_public: ctx.input.isPublic,
        compute: ctx.input.compute
      }
    });

    let funnel = mapFunnel(result.data.updateFunnel);
    return {
      output: funnel,
      message: `Updated funnel **${funnel.name}** (${funnel.funnelId}).`
    };
  })
  .build();

export let setFunnelFavourite = SlateTool.create(spec, {
  name: 'Set Funnel Favourite',
  key: 'set_funnel_favourite',
  description: `Mark or unmark a conversion funnel as a favourite in LiveSession.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      funnelId: z.string().describe('ID of the funnel'),
      isFavourite: z.boolean().describe('Whether to mark the funnel as favourite')
    })
  )
  .output(
    z.object({
      funnelId: z.string().describe('ID of the updated funnel'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.graphql(FUNNEL_SET_FAVOURITE_MUTATION, {
      funnel_id: ctx.input.funnelId,
      input: {
        is_favourite: ctx.input.isFavourite
      }
    });

    return {
      output: {
        funnelId: ctx.input.funnelId,
        success: result.data.funnelSetFavourite === true
      },
      message: ctx.input.isFavourite
        ? `Marked funnel **${ctx.input.funnelId}** as favourite.`
        : `Removed funnel **${ctx.input.funnelId}** from favourites.`
    };
  })
  .build();
