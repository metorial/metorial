import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let contactChanges = SlateTrigger.create(spec, {
  name: 'Contact Changes',
  key: 'contact_changes',
  description:
    'Triggers when contacts are created or modified in your Elorus organization. Polls for new and updated contacts.'
})
  .input(
    z.object({
      contactId: z.string().describe('The contact ID.'),
      eventType: z
        .enum(['created', 'updated'])
        .describe('Whether the contact was newly created or updated.'),
      contact: z.any().describe('The full contact object.')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('The contact ID.'),
      displayName: z.string().optional().describe('Contact display name.'),
      company: z.string().optional().describe('Company name.'),
      firstName: z.string().optional().describe('First name.'),
      lastName: z.string().optional().describe('Last name.'),
      email: z.string().optional().describe('Primary email address.'),
      vatNumber: z.string().optional().describe('VAT number.'),
      isClient: z.boolean().optional().describe('Whether the contact is a client.'),
      isSupplier: z.boolean().optional().describe('Whether the contact is a supplier.'),
      contact: z.any().describe('The full contact object.')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },
    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        organizationId: ctx.config.organizationId
      });

      let lastPollTime = ctx.state?.lastPollTime as string | undefined;
      let knownIds = (ctx.state?.knownIds as string[]) || [];

      let params: any = {
        ordering: '-modified',
        pageSize: 50
      };

      if (lastPollTime) {
        params.modifiedAfter = lastPollTime;
      }

      let result = await client.listContacts(params);
      let now = new Date().toISOString();

      let inputs = result.results.map((contact: any) => ({
        contactId: contact.id,
        eventType: (knownIds.includes(contact.id) ? 'updated' : 'created') as
          | 'created'
          | 'updated',
        contact
      }));

      let updatedKnownIds = [
        ...new Set([...knownIds, ...result.results.map((c: any) => c.id)])
      ].slice(-1000);

      return {
        inputs,
        updatedState: {
          lastPollTime: now,
          knownIds: updatedKnownIds
        }
      };
    },
    handleEvent: async ctx => {
      let c = ctx.input.contact;

      return {
        type: `contact.${ctx.input.eventType}`,
        id: `${c.id}-${c.modified || c.created || ctx.input.eventType}`,
        output: {
          contactId: c.id,
          displayName: c.display_name,
          company: c.company,
          firstName: c.first_name,
          lastName: c.last_name,
          email: c.email,
          vatNumber: c.vat_number,
          isClient: c.is_client,
          isSupplier: c.is_supplier,
          contact: c
        }
      };
    }
  })
  .build();
