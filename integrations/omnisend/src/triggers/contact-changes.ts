import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { OmnisendClient } from '../lib/client';
import { spec } from '../spec';

export let contactChanges = SlateTrigger.create(spec, {
  name: 'Contact Changes',
  key: 'contact_changes',
  description:
    'Triggers when contacts are created or updated in Omnisend. Polls for recently modified contacts and detects new and updated records.'
})
  .input(
    z.object({
      contactId: z.string().describe('Omnisend contact ID'),
      changeType: z
        .enum(['created', 'updated'])
        .describe('Whether the contact was created or updated'),
      email: z.string().optional().describe('Contact email'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      phone: z.array(z.string()).optional().describe('Phone numbers'),
      status: z.string().optional().describe('Subscription status'),
      tags: z.array(z.string()).optional().describe('Contact tags'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last updated timestamp')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('Omnisend contact ID'),
      changeType: z
        .enum(['created', 'updated'])
        .describe('Whether the contact was created or updated'),
      email: z.string().optional().describe('Contact email'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      phone: z.array(z.string()).optional().describe('Phone numbers'),
      status: z.string().optional().describe('Subscription status'),
      tags: z.array(z.string()).optional().describe('Contact tags'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last updated timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new OmnisendClient(ctx.auth.token);
      let lastPollTime = ctx.state?.lastPollTime as string | undefined;

      let params: Record<string, any> = { limit: 250 };
      if (lastPollTime) {
        params.updatedAfter = lastPollTime;
      }

      let result = await client.listContacts(params);
      let contacts = result.contacts || [];
      let newLastPollTime = lastPollTime;

      let inputs: Array<{
        contactId: string;
        changeType: 'created' | 'updated';
        email?: string;
        firstName?: string;
        lastName?: string;
        phone?: string[];
        status?: string;
        tags?: string[];
        createdAt?: string;
        updatedAt?: string;
      }> = [];

      for (let contact of contacts) {
        let updatedAt = contact.updatedAt || '';
        let createdAt = contact.createdAt || '';

        let isNew =
          !lastPollTime ||
          (createdAt &&
            createdAt >= lastPollTime &&
            Math.abs(new Date(createdAt).getTime() - new Date(updatedAt).getTime()) < 5000);

        inputs.push({
          contactId: contact.contactID,
          changeType: isNew ? 'created' : 'updated',
          email: contact.email,
          firstName: contact.firstName,
          lastName: contact.lastName,
          phone: contact.phone,
          status: contact.status,
          tags: contact.tags,
          createdAt,
          updatedAt
        });

        if (!newLastPollTime || updatedAt > newLastPollTime) {
          newLastPollTime = updatedAt;
        }
      }

      if (!lastPollTime && inputs.length === 0) {
        newLastPollTime = new Date().toISOString();
      }

      return {
        inputs,
        updatedState: {
          lastPollTime: newLastPollTime || new Date().toISOString()
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `contact.${ctx.input.changeType}`,
        id: `contact-${ctx.input.contactId}-${ctx.input.updatedAt || ctx.input.createdAt || Date.now()}`,
        output: {
          contactId: ctx.input.contactId,
          changeType: ctx.input.changeType,
          email: ctx.input.email,
          firstName: ctx.input.firstName,
          lastName: ctx.input.lastName,
          phone: ctx.input.phone,
          status: ctx.input.status,
          tags: ctx.input.tags,
          createdAt: ctx.input.createdAt,
          updatedAt: ctx.input.updatedAt
        }
      };
    }
  })
  .build();
