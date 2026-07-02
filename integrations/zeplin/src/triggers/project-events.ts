import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let actorSchema = z
  .object({
    userId: z.string().optional().describe('User ID of the actor'),
    email: z.string().optional().describe('Actor email'),
    username: z.string().optional().describe('Actor username')
  })
  .optional();

let contextSchema = z
  .object({
    projectId: z.string().optional().describe('Project ID'),
    projectName: z.string().optional().describe('Project name'),
    screenId: z.string().optional().describe('Screen ID (if applicable)'),
    screenName: z.string().optional().describe('Screen name (if applicable)')
  })
  .optional();

export let projectEvents = SlateTrigger.create(spec, {
  name: 'Project Events',
  key: 'project_events',
  description:
    'Triggered when changes occur in Zeplin projects, including screen updates, note changes, member changes, color/text style/component updates, and more.'
})
  .input(
    z.object({
      event: z.string().describe('Event type (e.g. project.screen, project.note)'),
      action: z.string().describe('Action performed (e.g. created, updated, deleted)'),
      timestamp: z.number().describe('UNIX timestamp of when the event occurred'),
      resourceId: z.string().optional().describe('ID of the affected resource'),
      resourceType: z.string().optional().describe('Type of the affected resource'),
      resourceData: z.any().optional().describe('Data of the affected resource'),
      context: z.any().optional().describe('Additional context (project, screen, etc.)'),
      actor: z.any().optional().describe('User who triggered the event'),
      deliveryId: z.string().optional().describe('Unique delivery ID for deduplication')
    })
  )
  .output(
    z.object({
      event: z.string().describe('Event type'),
      action: z.string().describe('Action performed'),
      timestamp: z.number().describe('UNIX timestamp'),
      resourceId: z.string().optional().describe('ID of the affected resource'),
      resourceType: z.string().optional().describe('Type of the affected resource'),
      resourceData: z.any().optional().describe('Data of the affected resource'),
      context: contextSchema.describe('Related context information'),
      actor: actorSchema.describe('User who triggered the event')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let deliveryId =
        ctx.request.headers.get('zeplin-delivery-id') ||
        `${body.event}-${body.timestamp}-${body.resource?.id}`;

      let context: any = {};
      if (body.context?.project) {
        context.projectId = body.context.project.id;
        context.projectName = body.context.project.extra?.name;
      }
      if (body.context?.screen) {
        context.screenId = body.context.screen.id;
        context.screenName = body.context.screen.extra?.name;
      }

      let actor: any;
      if (body.actor?.user) {
        actor = {
          userId: body.actor.user.id,
          email: body.actor.user.email,
          username: body.actor.user.username
        };
      }

      return {
        inputs: [
          {
            event: body.event,
            action: body.action,
            timestamp: body.timestamp,
            resourceId: body.resource?.id,
            resourceType: body.resource?.type,
            resourceData: body.resource?.data,
            context,
            actor,
            deliveryId
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventType = `${ctx.input.event}.${ctx.input.action}`;

      let context: any = {};
      if (ctx.input.context) {
        context = {
          projectId: ctx.input.context.projectId || ctx.input.context.project?.id,
          projectName: ctx.input.context.projectName || ctx.input.context.project?.extra?.name,
          screenId: ctx.input.context.screenId || ctx.input.context.screen?.id,
          screenName: ctx.input.context.screenName || ctx.input.context.screen?.extra?.name
        };
      }

      let actor: any;
      if (ctx.input.actor) {
        actor = {
          userId: ctx.input.actor.userId || ctx.input.actor.user?.id,
          email: ctx.input.actor.email || ctx.input.actor.user?.email,
          username: ctx.input.actor.username || ctx.input.actor.user?.username
        };
      }

      return {
        type: eventType,
        id:
          ctx.input.deliveryId ||
          `${ctx.input.event}-${ctx.input.timestamp}-${ctx.input.resourceId}`,
        output: {
          event: ctx.input.event,
          action: ctx.input.action,
          timestamp: ctx.input.timestamp,
          resourceId: ctx.input.resourceId,
          resourceType: ctx.input.resourceType,
          resourceData: ctx.input.resourceData,
          context,
          actor
        }
      };
    }
  })
  .build();
