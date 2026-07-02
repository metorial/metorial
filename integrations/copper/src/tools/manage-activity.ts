import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let activityOutputSchema = z.object({
  activityId: z.number().describe('Unique ID of the activity'),
  parentType: z
    .string()
    .nullable()
    .optional()
    .describe('Parent entity type (e.g., "person", "company", "opportunity")'),
  parentId: z.number().nullable().optional().describe('Parent entity ID'),
  activityTypeId: z.number().nullable().optional().describe('Activity type ID'),
  activityTypeCategory: z
    .string()
    .nullable()
    .optional()
    .describe('Activity type category (e.g., "user", "system")'),
  details: z.string().nullable().optional().describe('Activity content/description'),
  activityDate: z.number().nullable().optional().describe('Activity date (Unix timestamp)'),
  userId: z.number().nullable().optional().describe('ID of the user who created the activity'),
  dateCreated: z.number().nullable().optional().describe('Creation timestamp (Unix)'),
  dateModified: z.number().nullable().optional().describe('Last modified timestamp (Unix)')
});

let mapActivity = (a: any) => ({
  activityId: a.id,
  parentType: a.parent?.type,
  parentId: a.parent?.id,
  activityTypeId: a.type?.id,
  activityTypeCategory: a.type?.category,
  details: a.details,
  activityDate: a.activity_date,
  userId: a.user_id,
  dateCreated: a.date_created,
  dateModified: a.date_modified
});

export let logActivity = SlateTool.create(spec, {
  name: 'Log Activity',
  key: 'log_activity',
  description: `Log a new activity (note, call, meeting, etc.) against a CRM record. Activities are linked to a parent entity and categorized by activity type.`,
  instructions: [
    'Use "list_activity_types" tool first to get available activity type IDs if needed'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      parentType: z
        .string()
        .describe(
          'Parent entity type: "person", "company", "opportunity", "lead", "project", or "task"'
        ),
      parentId: z.number().describe('ID of the parent entity'),
      activityTypeId: z
        .number()
        .describe('Activity type ID (use list_activity_types to find available types)'),
      activityTypeCategory: z
        .string()
        .optional()
        .default('user')
        .describe('Activity type category, typically "user"'),
      details: z.string().describe('Activity content or description'),
      activityDate: z
        .number()
        .optional()
        .describe('Activity date as Unix timestamp (defaults to current time)')
    })
  )
  .output(activityOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    let body: Record<string, any> = {
      parent: {
        type: ctx.input.parentType,
        id: ctx.input.parentId
      },
      type: {
        id: ctx.input.activityTypeId,
        category: ctx.input.activityTypeCategory
      },
      details: ctx.input.details
    };
    if (ctx.input.activityDate) body.activity_date = ctx.input.activityDate;

    let activity = await client.createActivity(body);

    return {
      output: mapActivity(activity),
      message: `Logged activity (ID: ${activity.id}) on ${ctx.input.parentType} ${ctx.input.parentId}.`
    };
  })
  .build();

export let searchActivities = SlateTool.create(spec, {
  name: 'Search Activities',
  key: 'search_activities',
  description: `Search for activities in Copper CRM. Filter by parent entity, activity type, user, and date range to find specific interactions.`,
  constraints: ['Maximum 200 results per page'],
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      pageNumber: z.number().optional().default(1).describe('Page number (starting at 1)'),
      pageSize: z.number().optional().default(20).describe('Results per page (max 200)'),
      parentType: z.string().optional().describe('Filter by parent entity type'),
      parentId: z.number().optional().describe('Filter by parent entity ID'),
      activityTypes: z
        .array(
          z.object({
            activityTypeId: z.number(),
            activityTypeCategory: z.string()
          })
        )
        .optional()
        .describe('Filter by activity types'),
      minimumActivityDate: z
        .number()
        .optional()
        .describe('Minimum activity date (Unix timestamp)'),
      maximumActivityDate: z
        .number()
        .optional()
        .describe('Maximum activity date (Unix timestamp)')
    })
  )
  .output(
    z.object({
      activities: z.array(activityOutputSchema).describe('Matching activity records'),
      count: z.number().describe('Number of results returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    let body: Record<string, any> = {
      page_number: ctx.input.pageNumber,
      page_size: ctx.input.pageSize
    };
    if (ctx.input.parentType && ctx.input.parentId) {
      body.parent = { type: ctx.input.parentType, id: ctx.input.parentId };
    }
    if (ctx.input.activityTypes) {
      body.activity_types = ctx.input.activityTypes.map(at => ({
        id: at.activityTypeId,
        category: at.activityTypeCategory
      }));
    }
    if (ctx.input.minimumActivityDate)
      body.minimum_activity_date = ctx.input.minimumActivityDate;
    if (ctx.input.maximumActivityDate)
      body.maximum_activity_date = ctx.input.maximumActivityDate;

    let activities = await client.searchActivities(body);

    return {
      output: {
        activities: activities.map(mapActivity),
        count: activities.length
      },
      message: `Found **${activities.length}** activities matching the search criteria.`
    };
  })
  .build();

export let listActivityTypes = SlateTool.create(spec, {
  name: 'List Activity Types',
  key: 'list_activity_types',
  description: `List all available activity types in the Copper account. Returns both user-defined and system activity types with their IDs and categories.`,
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      activityTypes: z.array(z.any()).describe('Available activity types')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let types = await client.listActivityTypes();

    return {
      output: { activityTypes: types },
      message: `Retrieved activity types.`
    };
  })
  .build();
