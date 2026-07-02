import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { ZendeskClient } from '../lib/client';
import { spec } from '../spec';

export let organizationEvents = SlateTrigger.create(spec, {
  name: 'Organization Events',
  key: 'organization_events',
  description:
    'Triggers when organization activity occurs, including creation, deletion, name changes, tag changes, and custom field modifications.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of organization event'),
      eventId: z.string().describe('Unique event identifier'),
      organizationId: z.string().describe('The organization ID'),
      name: z.string().nullable().describe('The organization name'),
      tags: z.array(z.string()).describe('Tags on the organization'),
      externalId: z.string().nullable().describe('External system ID'),
      updatedAt: z.string().nullable().describe('When the organization was last updated')
    })
  )
  .output(
    z.object({
      organizationId: z.string().describe('The organization ID'),
      name: z.string().nullable().describe('The organization name'),
      tags: z.array(z.string()).describe('Tags on the organization'),
      externalId: z.string().nullable().describe('External system ID'),
      updatedAt: z.string().nullable().describe('When the organization was last updated')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new ZendeskClient({
        subdomain: ctx.config.subdomain,
        token: ctx.auth.token,
        tokenType: ctx.auth.tokenType
      });

      let webhook = await client.createWebhook({
        name: 'Slates Organization Events',
        status: 'active',
        endpoint: ctx.input.webhookBaseUrl,
        http_method: 'POST',
        request_format: 'json',
        subscriptions: [
          'zen:event-type:organization.created',
          'zen:event-type:organization.deleted',
          'zen:event-type:organization.ExternalIdChanged',
          'zen:event-type:organization.CustomFieldChanged',
          'zen:event-type:organization.TagsChanged',
          'zen:event-type:organization.NameChanged'
        ]
      });

      return {
        registrationDetails: {
          webhookId: webhook.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new ZendeskClient({
        subdomain: ctx.config.subdomain,
        token: ctx.auth.token,
        tokenType: ctx.auth.tokenType
      });

      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data: any = await ctx.request.json();

      let eventType = 'organization.updated';
      if (data.type) {
        let typeParts = String(data.type).split(':');
        eventType = typeParts[typeParts.length - 1] || 'organization.updated';
      }
      if (data.event?.type) {
        eventType = data.event.type;
      }

      let org = data.detail?.organization || data.organization || data;
      let orgId = String(org.id || data.id || 'unknown');

      return {
        inputs: [
          {
            eventType,
            eventId: `${orgId}-${data.id || Date.now()}`,
            organizationId: orgId,
            name: org.name || null,
            tags: org.tags || [],
            externalId: org.external_id || null,
            updatedAt: org.updated_at || null
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventType = ctx.input.eventType.toLowerCase().replace(/\s+/g, '_');
      if (!eventType.startsWith('organization.')) {
        eventType = `organization.${eventType}`;
      }

      return {
        type: eventType,
        id: ctx.input.eventId,
        output: {
          organizationId: ctx.input.organizationId,
          name: ctx.input.name,
          tags: ctx.input.tags,
          externalId: ctx.input.externalId,
          updatedAt: ctx.input.updatedAt
        }
      };
    }
  })
  .build();
