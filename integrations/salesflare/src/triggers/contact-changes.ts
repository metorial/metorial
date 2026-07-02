import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let contactChanges = SlateTrigger.create(spec, {
  name: 'Contact Changes',
  key: 'contact_changes',
  description:
    'Triggers when contacts are created or modified in Salesflare. Uses the modification_after parameter to detect incremental changes.'
})
  .input(
    z.object({
      contactId: z.number().describe('ID of the changed contact'),
      changeType: z
        .enum(['created', 'updated'])
        .describe('Whether the contact was created or updated'),
      contact: z.record(z.string(), z.any()).describe('Full contact data')
    })
  )
  .output(
    z.object({
      contactId: z.number().describe('Contact ID'),
      name: z.string().optional().describe('Contact full name'),
      email: z.string().optional().describe('Contact email'),
      firstname: z.string().optional().describe('First name'),
      lastname: z.string().optional().describe('Last name'),
      accountId: z.number().optional().describe('Associated account ID'),
      accountName: z.string().optional().describe('Associated account name'),
      modificationDate: z.string().optional().describe('Last modification date'),
      creationDate: z.string().optional().describe('Creation date'),
      tags: z.array(z.string()).optional().describe('Tag names'),
      role: z.string().optional().describe('Contact role/title'),
      organisation: z.string().optional().describe('Contact organisation')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client(ctx.auth.token);

      let lastPolledAt = ctx.state?.lastPolledAt as string | undefined;
      let knownContactIds = (ctx.state?.knownContactIds as number[]) || [];

      let params: Record<string, any> = {
        limit: 100,
        offset: 0,
        order_by: ['modification_date asc']
      };

      if (lastPolledAt) {
        params.modification_after = lastPolledAt;
      }

      let contacts = await client.listContacts(params);
      let list = Array.isArray(contacts) ? contacts : [];

      let inputs = list.map((contact: any) => {
        let isNew = !knownContactIds.includes(contact.id);
        return {
          contactId: contact.id,
          changeType: (isNew ? 'created' : 'updated') as 'created' | 'updated',
          contact
        };
      });

      let newKnownIds = [...new Set([...knownContactIds, ...list.map((c: any) => c.id)])];

      // Keep only the last 10000 IDs to avoid unbounded growth
      if (newKnownIds.length > 10000) {
        newKnownIds = newKnownIds.slice(-10000);
      }

      let newLastPolledAt =
        list.length > 0
          ? list[list.length - 1].modification_date || new Date().toISOString()
          : lastPolledAt || new Date().toISOString();

      return {
        inputs,
        updatedState: {
          lastPolledAt: newLastPolledAt,
          knownContactIds: newKnownIds
        }
      };
    },

    handleEvent: async ctx => {
      let contact = ctx.input.contact as Record<string, any>;
      let account = contact.account as Record<string, any> | undefined;

      let tagNames: string[] = [];
      if (Array.isArray(contact.tags)) {
        tagNames = contact.tags
          .map((t: any) => (typeof t === 'string' ? t : t.name))
          .filter(Boolean);
      }

      return {
        type: `contact.${ctx.input.changeType}`,
        id: `${ctx.input.contactId}-${contact.modification_date || ctx.input.contactId}`,
        output: {
          contactId: ctx.input.contactId,
          name: contact.name as string | undefined,
          email: contact.email as string | undefined,
          firstname: contact.firstname as string | undefined,
          lastname: contact.lastname as string | undefined,
          accountId: account?.id as number | undefined,
          accountName: account?.name as string | undefined,
          modificationDate: contact.modification_date as string | undefined,
          creationDate: contact.creation_date as string | undefined,
          tags: tagNames,
          role: contact.role as string | undefined,
          organisation: contact.organisation as string | undefined
        }
      };
    }
  })
  .build();
