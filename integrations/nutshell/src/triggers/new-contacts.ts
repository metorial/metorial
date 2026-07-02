import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { NutshellClient } from '../lib/client';
import { spec } from '../spec';

export let newContacts = SlateTrigger.create(spec, {
  name: 'New Contacts',
  key: 'new_contacts',
  description:
    '[Polling fallback] Polls for newly created contacts (people) in Nutshell CRM. Detects contacts added since the last check.'
})
  .input(
    z.object({
      contactId: z.number().describe('ID of the contact'),
      name: z.string().describe('Contact name'),
      createdTime: z.string().optional().describe('Creation timestamp')
    })
  )
  .output(
    z.object({
      contactId: z.number().describe('ID of the contact'),
      name: z.string().describe('Full name of the contact'),
      emails: z.array(z.any()).optional().describe('Email addresses'),
      phones: z.array(z.any()).optional().describe('Phone numbers'),
      title: z.string().optional().describe('Job title'),
      accounts: z.array(z.any()).optional().describe('Associated accounts'),
      createdTime: z.string().optional().describe('Creation timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new NutshellClient({
        username: ctx.auth.username,
        token: ctx.auth.token
      });

      let lastSeenId = (ctx.state as any)?.lastSeenId as number | undefined;

      let results = await client.findContacts({
        orderBy: 'id',
        orderDirection: 'DESC',
        limit: 50,
        page: 1
      });

      let newContactsList = lastSeenId
        ? results.filter((c: any) => c.id > lastSeenId)
        : results.slice(0, 1);

      let highestId =
        results.length > 0 ? Math.max(...results.map((c: any) => c.id)) : lastSeenId;

      let inputs = newContactsList.map((c: any) => ({
        contactId: c.id,
        name: c.name,
        createdTime: c.createdTime
      }));

      return {
        inputs,
        updatedState: {
          lastSeenId: highestId ?? lastSeenId
        }
      };
    },

    handleEvent: async ctx => {
      let client = new NutshellClient({
        username: ctx.auth.username,
        token: ctx.auth.token
      });

      let contact: any;
      try {
        contact = await client.getContact(ctx.input.contactId);
      } catch {
        contact = null;
      }

      return {
        type: 'contact.created',
        id: `contact-${ctx.input.contactId}`,
        output: {
          contactId: ctx.input.contactId,
          name: contact?.name || ctx.input.name,
          emails: contact?.email || contact?.emails,
          phones: contact?.phone || contact?.phones,
          title: contact?.title,
          accounts: contact?.accounts,
          createdTime: contact?.createdTime || ctx.input.createdTime
        }
      };
    }
  })
  .build();
