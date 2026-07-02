import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { googleAdminActionScopes } from '../scopes';
import { spec } from '../spec';

export let manageCalendarResources = SlateTool.create(spec, {
  name: 'Manage Calendar Resources',
  key: 'manage_calendar_resources',
  description: `List, create, update, or delete calendar resources like meeting rooms and equipment. These resources appear in Google Calendar for booking.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .scopes(googleAdminActionScopes.manageCalendarResources)
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      calendarResourceId: z
        .string()
        .optional()
        .describe(
          'Calendar resource ID (required for get, update, delete; also used as the ID when creating)'
        ),
      resourceName: z
        .string()
        .optional()
        .describe('Name of the resource (required for create)'),
      resourceType: z
        .string()
        .optional()
        .describe('Type of resource (e.g. "Conference Room", "Equipment")'),
      resourceDescription: z.string().optional().describe('Description of the resource'),
      buildingId: z.string().optional().describe('Building ID the resource belongs to'),
      floorName: z.string().optional().describe('Floor name/number'),
      capacity: z.number().optional().describe('Room capacity'),
      query: z.string().optional().describe('Search query for listing resources'),
      maxResults: z.number().optional(),
      pageToken: z.string().optional()
    })
  )
  .output(
    z.object({
      resources: z
        .array(
          z.object({
            calendarResourceId: z.string().optional(),
            resourceName: z.string().optional(),
            resourceType: z.string().optional(),
            resourceDescription: z.string().optional(),
            resourceEmail: z.string().optional(),
            buildingId: z.string().optional(),
            floorName: z.string().optional(),
            capacity: z.number().optional(),
            generatedResourceName: z.string().optional()
          })
        )
        .optional(),
      resource: z
        .object({
          calendarResourceId: z.string().optional(),
          resourceName: z.string().optional(),
          resourceType: z.string().optional(),
          resourceDescription: z.string().optional(),
          resourceEmail: z.string().optional(),
          buildingId: z.string().optional(),
          floorName: z.string().optional(),
          capacity: z.number().optional(),
          generatedResourceName: z.string().optional()
        })
        .optional(),
      nextPageToken: z.string().optional(),
      deleted: z.boolean().optional(),
      action: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      customerId: ctx.config.customerId,
      domain: ctx.config.domain
    });

    let mapResource = (r: any) => ({
      calendarResourceId: r.resourceId ?? r.calendarResourceId,
      resourceName: r.resourceName,
      resourceType: r.resourceType,
      resourceDescription: r.resourceDescription,
      resourceEmail: r.resourceEmail,
      buildingId: r.buildingId,
      floorName: r.floorName,
      capacity: r.capacity,
      generatedResourceName: r.generatedResourceName
    });

    if (ctx.input.action === 'list') {
      let result = await client.listCalendarResources({
        query: ctx.input.query,
        maxResults: ctx.input.maxResults,
        pageToken: ctx.input.pageToken
      });

      let resources = (result.items || []).map(mapResource);
      return {
        output: { resources, nextPageToken: result.nextPageToken, action: 'list' },
        message: `Found **${resources.length}** calendar resources.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.calendarResourceId || !ctx.input.resourceName) {
        throw new Error(
          'calendarResourceId and resourceName are required to create a resource'
        );
      }
      let r = await client.createCalendarResource({
        resourceId: ctx.input.calendarResourceId,
        resourceName: ctx.input.resourceName,
        resourceType: ctx.input.resourceType,
        resourceDescription: ctx.input.resourceDescription,
        buildingId: ctx.input.buildingId,
        floorName: ctx.input.floorName,
        capacity: ctx.input.capacity
      });
      return {
        output: { resource: mapResource(r), action: 'create' },
        message: `Created calendar resource **${r.resourceName}**.`
      };
    }

    if (!ctx.input.calendarResourceId) throw new Error('calendarResourceId is required');

    if (ctx.input.action === 'get') {
      let r = await client.getCalendarResource(ctx.input.calendarResourceId);
      return {
        output: { resource: mapResource(r), action: 'get' },
        message: `Retrieved calendar resource **${r.resourceName}** (${r.resourceEmail}).`
      };
    }

    if (ctx.input.action === 'update') {
      let updateData: Record<string, any> = {
        resourceId: ctx.input.calendarResourceId
      };
      if (ctx.input.resourceName) updateData.resourceName = ctx.input.resourceName;
      if (ctx.input.resourceType) updateData.resourceType = ctx.input.resourceType;
      if (ctx.input.resourceDescription !== undefined)
        updateData.resourceDescription = ctx.input.resourceDescription;
      if (ctx.input.buildingId) updateData.buildingId = ctx.input.buildingId;
      if (ctx.input.floorName) updateData.floorName = ctx.input.floorName;
      if (ctx.input.capacity !== undefined) updateData.capacity = ctx.input.capacity;

      let r = await client.updateCalendarResource(ctx.input.calendarResourceId, updateData);
      return {
        output: { resource: mapResource(r), action: 'update' },
        message: `Updated calendar resource **${r.resourceName}**.`
      };
    }

    // delete
    await client.deleteCalendarResource(ctx.input.calendarResourceId);
    return {
      output: { deleted: true, action: 'delete' },
      message: `Deleted calendar resource **${ctx.input.calendarResourceId}**.`
    };
  })
  .build();
