import { SlateTool } from 'slates';
import { z } from 'zod';
import { MoosendClient } from '../lib/client';
import { spec } from '../spec';

let criteriaSchema = z.object({
  field: z
    .string()
    .describe(
      'Field to filter on (e.g. "DateAdded", "CampaignOpens", or a custom field name)'
    ),
  comparer: z
    .enum([
      'Is',
      'IsNot',
      'Contains',
      'DoesNotContain',
      'StartsWith',
      'EndsWith',
      'IsGreaterThan',
      'IsLessThan',
      'IsBefore',
      'IsAfter'
    ])
    .optional()
    .describe('Comparison operator'),
  value: z.string().describe('Value to compare against'),
  dateFrom: z.string().optional().describe('Start date for date range criteria'),
  dateTo: z.string().optional().describe('End date for date range criteria')
});

let segmentOutputSchema = z.object({
  segmentId: z.string().describe('Segment ID'),
  name: z.string().describe('Segment name'),
  matchType: z.number().optional().describe('How criteria match together (0 = All, 1 = Any)'),
  createdOn: z.string().optional().describe('Creation timestamp'),
  updatedOn: z.string().optional().describe('Last update timestamp'),
  criteria: z
    .array(
      z.object({
        criteriaId: z.string().optional().describe('Criteria ID'),
        field: z.string().optional().describe('Field name'),
        comparer: z.string().optional().describe('Comparison operator'),
        value: z.string().optional().describe('Comparison value')
      })
    )
    .optional()
    .describe('Segment criteria/rules')
});

export let manageSegment = SlateTool.create(spec, {
  name: 'Manage Segment',
  key: 'manage_segment',
  description: `Create, update, delete, or retrieve segments for a mailing list. Segments let you target specific audiences based on subscriber data and activity criteria. You can also add or update criteria (rules) within segments.`,
  instructions: [
    'Create a segment first, then add criteria to define the audience.',
    'Use action "add_criteria" to add filtering rules to an existing segment.',
    'Use action "get_subscribers" to see which subscribers match the segment criteria.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'create',
          'update',
          'delete',
          'get',
          'list',
          'add_criteria',
          'update_criteria',
          'get_subscribers'
        ])
        .describe('Action to perform'),
      mailingListId: z.string().describe('ID of the mailing list'),
      segmentId: z
        .string()
        .optional()
        .describe(
          'Segment ID (required for update, delete, get, add_criteria, update_criteria, get_subscribers)'
        ),
      name: z.string().optional().describe('Segment name (required for create)'),
      matchType: z
        .enum(['All', 'Any'])
        .optional()
        .describe('How criteria match together: "All" (AND) or "Any" (OR)'),
      criteria: criteriaSchema.optional().describe('Criteria to add or update'),
      criteriaId: z.string().optional().describe('Criteria ID (required for update_criteria)'),
      page: z.number().optional().default(1).describe('Page number for get_subscribers'),
      pageSize: z
        .number()
        .optional()
        .default(100)
        .describe('Items per page for get_subscribers')
    })
  )
  .output(
    z.object({
      segments: z.array(segmentOutputSchema).optional().describe('Segment(s) returned'),
      subscribers: z
        .array(
          z.object({
            subscriberId: z.string().describe('Subscriber ID'),
            email: z.string().describe('Subscriber email'),
            name: z.string().optional().describe('Subscriber name')
          })
        )
        .optional()
        .describe('Subscribers matching segment criteria (for get_subscribers)'),
      action: z.string().describe('Action performed'),
      success: z.boolean().describe('Whether the action completed successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MoosendClient({ token: ctx.auth.token });
    let { action, mailingListId } = ctx.input;

    switch (action) {
      case 'create': {
        if (!ctx.input.name) throw new Error('name is required for creating a segment');
        let result = await client.createSegment(
          mailingListId,
          ctx.input.name,
          ctx.input.matchType
        );
        return {
          output: {
            segments: [mapSegment(result)],
            action,
            success: true
          },
          message: `Created segment **${ctx.input.name}** on list ${mailingListId}.`
        };
      }
      case 'update': {
        if (!ctx.input.segmentId)
          throw new Error('segmentId is required for updating a segment');
        if (!ctx.input.name) throw new Error('name is required for updating a segment');
        let result = await client.updateSegment(
          mailingListId,
          ctx.input.segmentId,
          ctx.input.name,
          ctx.input.matchType
        );
        return {
          output: {
            segments: [mapSegment(result)],
            action,
            success: true
          },
          message: `Updated segment **${ctx.input.segmentId}**.`
        };
      }
      case 'delete': {
        if (!ctx.input.segmentId)
          throw new Error('segmentId is required for deleting a segment');
        await client.deleteSegment(mailingListId, ctx.input.segmentId);
        return {
          output: {
            action,
            success: true
          },
          message: `Deleted segment **${ctx.input.segmentId}** and its criteria.`
        };
      }
      case 'get': {
        if (!ctx.input.segmentId)
          throw new Error('segmentId is required for getting segment details');
        let result = await client.getSegment(mailingListId, ctx.input.segmentId);
        return {
          output: {
            segments: [mapSegment(result)],
            action,
            success: true
          },
          message: `Retrieved segment **${result?.Name ?? ctx.input.segmentId}**.`
        };
      }
      case 'list': {
        let result = await client.getSegments(mailingListId);
        let segmentsList = (
          Array.isArray(result)
            ? result
            : ((result?.Segments as Record<string, unknown>[]) ?? [])
        ) as Record<string, unknown>[];
        return {
          output: {
            segments: segmentsList.map(mapSegment),
            action,
            success: true
          },
          message: `Retrieved **${segmentsList.length}** segment(s) from list ${mailingListId}.`
        };
      }
      case 'add_criteria': {
        if (!ctx.input.segmentId) throw new Error('segmentId is required for adding criteria');
        if (!ctx.input.criteria) throw new Error('criteria is required for add_criteria');
        let body: Record<string, unknown> = {
          Field: ctx.input.criteria.field,
          Value: ctx.input.criteria.value
        };
        if (ctx.input.criteria.comparer) body.Comparer = ctx.input.criteria.comparer;
        if (ctx.input.criteria.dateFrom) body.DateFrom = ctx.input.criteria.dateFrom;
        if (ctx.input.criteria.dateTo) body.DateTo = ctx.input.criteria.dateTo;
        let _result = await client.addSegmentCriteria(
          mailingListId,
          ctx.input.segmentId,
          body
        );
        return {
          output: {
            action,
            success: true
          },
          message: `Added criteria to segment **${ctx.input.segmentId}**: ${ctx.input.criteria.field} ${ctx.input.criteria.comparer ?? ''} ${ctx.input.criteria.value}.`
        };
      }
      case 'update_criteria': {
        if (!ctx.input.segmentId)
          throw new Error('segmentId is required for updating criteria');
        if (!ctx.input.criteriaId)
          throw new Error('criteriaId is required for update_criteria');
        if (!ctx.input.criteria) throw new Error('criteria is required for update_criteria');
        let body: Record<string, unknown> = {
          Field: ctx.input.criteria.field,
          Value: ctx.input.criteria.value
        };
        if (ctx.input.criteria.comparer) body.Comparer = ctx.input.criteria.comparer;
        if (ctx.input.criteria.dateFrom) body.DateFrom = ctx.input.criteria.dateFrom;
        if (ctx.input.criteria.dateTo) body.DateTo = ctx.input.criteria.dateTo;
        await client.updateSegmentCriteria(
          mailingListId,
          ctx.input.segmentId,
          ctx.input.criteriaId,
          body
        );
        return {
          output: {
            action,
            success: true
          },
          message: `Updated criteria **${ctx.input.criteriaId}** in segment ${ctx.input.segmentId}.`
        };
      }
      case 'get_subscribers': {
        if (!ctx.input.segmentId)
          throw new Error('segmentId is required for getting segment subscribers');
        let result = await client.getSegmentSubscribers(
          mailingListId,
          ctx.input.segmentId,
          ctx.input.page,
          ctx.input.pageSize
        );
        let subscribersList = (result?.Subscribers as Record<string, unknown>[]) ?? [];
        return {
          output: {
            subscribers: subscribersList.map(s => ({
              subscriberId: String(s?.ID ?? ''),
              email: String(s?.Email ?? ''),
              name: s?.Name ? String(s.Name) : undefined
            })),
            action,
            success: true
          },
          message: `Retrieved **${subscribersList.length}** subscriber(s) matching segment ${ctx.input.segmentId}.`
        };
      }
    }
  })
  .build();

let mapSegment = (s: Record<string, unknown>) => ({
  segmentId: String(s?.ID ?? ''),
  name: String(s?.Name ?? ''),
  matchType: s?.MatchType as number | undefined,
  createdOn: s?.CreatedOn ? String(s.CreatedOn) : undefined,
  updatedOn: s?.UpdatedOn ? String(s.UpdatedOn) : undefined,
  criteria: Array.isArray(s?.Criteria)
    ? (s.Criteria as Record<string, unknown>[]).map(c => ({
        criteriaId: c?.ID ? String(c.ID) : undefined,
        field: c?.Field ? String(c.Field) : undefined,
        comparer: c?.Comparer ? String(c.Comparer) : undefined,
        value: c?.Value ? String(c.Value) : undefined
      }))
    : undefined
});
