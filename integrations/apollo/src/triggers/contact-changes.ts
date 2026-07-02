import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let contactChanges = SlateTrigger.create(spec, {
  name: 'Contact Changes',
  key: 'contact_changes',
  description:
    'Polls for new or updated contacts in your Apollo account. Detects contacts that have been created or modified since the last check.'
})
  .input(
    z.object({
      contactId: z.string().describe('Apollo contact ID'),
      eventType: z
        .enum(['created', 'updated'])
        .describe('Whether the contact was newly created or updated'),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().optional(),
      title: z.string().optional(),
      organizationName: z.string().optional(),
      accountId: z.string().optional(),
      ownerId: z.string().optional(),
      contactStageId: z.string().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('Apollo contact ID'),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      name: z.string().optional(),
      email: z.string().optional(),
      title: z.string().optional(),
      organizationName: z.string().optional(),
      accountId: z.string().optional(),
      ownerId: z.string().optional(),
      contactStageId: z.string().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });

      let lastPolledAt = ctx.state?.lastPolledAt as string | undefined;
      let knownContactIds = (ctx.state?.knownContactIds as Record<string, string>) || {};

      let result = await client.searchContacts({
        sortByField: 'contact_updated_at',
        sortAscending: false,
        page: 1,
        perPage: 100
      });

      let inputs: Array<{
        contactId: string;
        eventType: 'created' | 'updated';
        firstName?: string;
        lastName?: string;
        email?: string;
        title?: string;
        organizationName?: string;
        accountId?: string;
        ownerId?: string;
        contactStageId?: string;
        createdAt?: string;
        updatedAt?: string;
      }> = [];

      let updatedKnownIds: Record<string, string> = { ...knownContactIds };

      for (let contact of result.contacts) {
        if (!contact.id) continue;

        let updatedAt = contact.updated_at || contact.created_at || '';
        let previousUpdatedAt = knownContactIds[contact.id];

        if (!previousUpdatedAt) {
          if (lastPolledAt && contact.created_at && contact.created_at > lastPolledAt) {
            inputs.push({
              contactId: contact.id,
              eventType: 'created',
              firstName: contact.first_name,
              lastName: contact.last_name,
              email: contact.email,
              title: contact.title,
              organizationName: contact.organization_name,
              accountId: contact.account_id,
              ownerId: contact.owner_id,
              contactStageId: contact.contact_stage_id,
              createdAt: contact.created_at,
              updatedAt: contact.updated_at
            });
          } else if (!lastPolledAt) {
            // First poll — just record state, don't emit
          }
        } else if (updatedAt && updatedAt !== previousUpdatedAt) {
          inputs.push({
            contactId: contact.id,
            eventType: 'updated',
            firstName: contact.first_name,
            lastName: contact.last_name,
            email: contact.email,
            title: contact.title,
            organizationName: contact.organization_name,
            accountId: contact.account_id,
            ownerId: contact.owner_id,
            contactStageId: contact.contact_stage_id,
            createdAt: contact.created_at,
            updatedAt: contact.updated_at
          });
        }

        updatedKnownIds[contact.id] = updatedAt;
      }

      return {
        inputs,
        updatedState: {
          lastPolledAt: new Date().toISOString(),
          knownContactIds: updatedKnownIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `contact.${ctx.input.eventType}`,
        id: `${ctx.input.contactId}-${ctx.input.updatedAt || ctx.input.createdAt || Date.now()}`,
        output: {
          contactId: ctx.input.contactId,
          firstName: ctx.input.firstName,
          lastName: ctx.input.lastName,
          name:
            [ctx.input.firstName, ctx.input.lastName].filter(Boolean).join(' ') || undefined,
          email: ctx.input.email,
          title: ctx.input.title,
          organizationName: ctx.input.organizationName,
          accountId: ctx.input.accountId,
          ownerId: ctx.input.ownerId,
          contactStageId: ctx.input.contactStageId,
          createdAt: ctx.input.createdAt,
          updatedAt: ctx.input.updatedAt
        }
      };
    }
  })
  .build();
