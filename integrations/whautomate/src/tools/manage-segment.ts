import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageSegment = SlateTool.create(spec, {
  name: 'Manage Segment',
  key: 'manage_segment',
  description: `Create, retrieve, list, or delete audience segments. Segments use criteria-based filtering including tags, gender, age range, activity recency, contact stage, and locations. Segments are used for targeting broadcasts and automation workflows.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'get', 'list', 'delete']).describe('Action to perform'),
      segmentId: z.string().optional().describe('Segment ID (required for get and delete)'),
      name: z.string().optional().describe('Segment name (for create)'),
      type: z
        .enum(['client', 'contact'])
        .optional()
        .describe('Audience type (required for create)'),
      locationId: z
        .string()
        .optional()
        .describe('Location ID from list_locations (required for create, optional for list)'),
      tags: z.array(z.string()).optional().describe('Include tags criteria (for create)'),
      exclusionTags: z
        .array(z.string())
        .optional()
        .describe('Exclusion tags criteria (for create)'),
      gender: z.string().optional().describe('Gender filter (for create)'),
      ageFrom: z.number().optional().describe('Minimum age (for create)'),
      ageTo: z.number().optional().describe('Maximum age (for create)'),
      daysSinceLastActivity: z
        .number()
        .optional()
        .describe('Number of days since last activity (for create)'),
      contactStage: z.string().optional().describe('Contact stage filter (for create)'),
      primaryLocations: z
        .array(z.string())
        .optional()
        .describe('Primary location IDs (for create)'),
      search: z.string().optional().describe('Search filter (for list)'),
      page: z.number().optional().describe('Page number (for list)'),
      pageSize: z.number().optional().describe('Results per page (for list)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded'),
      segment: z.record(z.string(), z.any()).optional().describe('Segment record'),
      segments: z.array(z.record(z.string(), z.any())).optional().describe('List of segments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiHost: ctx.config.apiHost
    });

    let { action } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.name) throw createApiServiceError('name is required for create');
      if (!ctx.input.type || !ctx.input.locationId)
        throw createApiServiceError(
          'type and locationId from list_locations are required to create a segment.'
        );
      let data = {
        name: ctx.input.name,
        type: ctx.input.type,
        location: { id: ctx.input.locationId },
        criteria: pickDefined({
          tags: ctx.input.tags,
          exclusionTags: ctx.input.exclusionTags,
          gender: ctx.input.gender,
          ageFrom: ctx.input.ageFrom,
          ageTo: ctx.input.ageTo,
          numberOfDaysLastActivity: ctx.input.daysSinceLastActivity,
          contactStage: ctx.input.contactStage,
          primaryLocations: ctx.input.primaryLocations?.map(id => ({ id }))
        })
      };

      let result = await client.createSegment(data);
      return {
        output: { success: true, segment: result },
        message: `Created segment **${ctx.input.name}**.`
      };
    }

    if (action === 'get') {
      if (!ctx.input.segmentId) throw createApiServiceError('segmentId is required for get');
      let result = await client.getSegment(ctx.input.segmentId);
      return {
        output: { success: true, segment: result },
        message: `Retrieved segment **${result.name || ctx.input.segmentId}**.`
      };
    }

    if (action === 'list') {
      let result = await client.listSegments({
        search: ctx.input.search,
        locationId: ctx.input.locationId,
        page: ctx.input.page,
        pageSize: ctx.input.pageSize
      });
      let segments = Array.isArray(result) ? result : result.segments || result.data || [];
      return {
        output: { success: true, segments },
        message: `Found **${segments.length}** segment(s).`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.segmentId)
        throw createApiServiceError('segmentId is required for delete');
      await client.deleteSegment(ctx.input.segmentId);
      return {
        output: { success: true },
        message: `Deleted segment ${ctx.input.segmentId}.`
      };
    }

    throw createApiServiceError(`Unknown action: ${action}`);
  })
  .build();
