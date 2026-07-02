import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { zohoServiceError } from '../lib/errors';
import type { Datacenter } from '../lib/urls';
import { spec } from '../spec';

export let deskEvents = SlateTrigger.create(spec, {
  name: 'Desk Events',
  key: 'desk_events',
  description:
    'Triggers when tickets, contacts, accounts, tasks, or other resources are created, updated, or deleted in Zoho Desk. Uses Zoho Desk webhook subscriptions for real-time notifications.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('Desk event type (e.g., Ticket_Add, Ticket_Update, Contact_Add)'),
      resourceId: z.string().describe('ID of the affected resource'),
      payload: z.record(z.string(), z.any()).describe('Full event payload from Zoho Desk')
    })
  )
  .output(
    z.object({
      eventType: z.string().describe('Event type (e.g., Ticket_Add, Ticket_Update)'),
      resourceType: z.string().describe('Resource type (e.g., ticket, contact, account)'),
      resourceId: z.string().describe('ID of the affected resource'),
      ticketNumber: z.string().optional().describe('Ticket number (for ticket events)'),
      subject: z.string().optional().describe('Ticket subject (for ticket events)'),
      status: z.string().optional().describe('Current status'),
      departmentId: z.string().optional().describe('Department ID'),
      payload: z.record(z.string(), z.any()).describe('Full event payload')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let _dc = (ctx.auth.datacenter || ctx.config.datacenter || 'us') as Datacenter;
      // We need an orgId - we'll try to extract from existing config or require it
      // For auto-registration, the orgId must be available; we'll use a default approach
      // The orgId should be provided as part of trigger configuration
      // For now, we register the webhook if we can determine the orgId

      // Since we don't have orgId from config, we'll try to retrieve from Desk API
      // This is a limitation - the user should configure orgId in trigger setup
      // We'll need to accept that the trigger may need manual configuration

      // Note: This auto-registration requires orgId. In practice, the user should
      // provide it. We'll throw an informative error if not available.
      throw zohoServiceError(
        'Zoho Desk webhooks require an organization ID (orgId). Please configure the webhook manually in Zoho Desk settings, pointing to the webhook URL.'
      );
    },

    handleRequest: async ctx => {
      let body: any;
      try {
        body = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      if (!body || typeof body !== 'object') return { inputs: [] };

      // Zoho Desk webhook payloads include event info and the affected resource
      let eventType = body.eventType || body.event_type || '';
      let payload = body.payload || body;

      // Extract resource ID based on event type
      let resourceId =
        payload.id ||
        payload.ticketId ||
        payload.contactId ||
        payload.accountId ||
        payload.taskId ||
        '';

      let inputs = [
        {
          eventType: eventType.toString(),
          resourceId: resourceId.toString(),
          payload
        }
      ];

      return { inputs };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.payload;
      let eventType = ctx.input.eventType;

      // Determine resource type from event type
      let resourceType = 'unknown';
      if (eventType.startsWith('Ticket')) resourceType = 'ticket';
      else if (eventType.startsWith('Contact')) resourceType = 'contact';
      else if (eventType.startsWith('Account')) resourceType = 'account';
      else if (eventType.startsWith('Task')) resourceType = 'task';
      else if (eventType.startsWith('Call')) resourceType = 'call';
      else if (eventType.startsWith('Event')) resourceType = 'event';
      else if (eventType.startsWith('IM')) resourceType = 'im';
      else if (eventType.startsWith('Department')) resourceType = 'department';

      let normalizedType = eventType.toLowerCase().replace(/_/g, '.');

      return {
        type: `desk.${normalizedType}`,
        id: `${eventType}-${ctx.input.resourceId}-${Date.now()}`,
        output: {
          eventType,
          resourceType,
          resourceId: ctx.input.resourceId,
          ticketNumber: payload.ticketNumber,
          subject: payload.subject,
          status: payload.status || payload.statusType,
          departmentId: payload.departmentId,
          payload
        }
      };
    }
  })
  .build();
