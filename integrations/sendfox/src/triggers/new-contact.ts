import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newContact = SlateTrigger.create(spec, {
  name: 'New Contact',
  key: 'new_contact',
  description: 'Triggers when a new contact is created in SendFox.'
})
  .input(
    z.object({
      contactId: z.number().describe('ID of the contact'),
      email: z.string().describe('Email address'),
      firstName: z.string().describe('First name'),
      lastName: z.string().describe('Last name'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .output(
    z.object({
      contactId: z.number().describe('Contact ID'),
      email: z.string().describe('Email address'),
      firstName: z.string().describe('First name'),
      lastName: z.string().describe('Last name'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let lastSeenId: number | null = ctx.state?.lastSeenId ?? null;
      let inputs: Array<{
        contactId: number;
        email: string;
        firstName: string;
        lastName: string;
        createdAt: string;
      }> = [];

      let page = 1;
      let foundExisting = false;
      let newLastSeenId = lastSeenId;

      while (!foundExisting) {
        let result = await client.listContacts(page);

        if (result.data.length === 0) break;

        for (let contact of result.data) {
          if (lastSeenId !== null && contact.id <= lastSeenId) {
            foundExisting = true;
            break;
          }

          if (newLastSeenId === null || contact.id > newLastSeenId) {
            newLastSeenId = contact.id;
          }

          inputs.push({
            contactId: contact.id,
            email: contact.email,
            firstName: contact.first_name,
            lastName: contact.last_name,
            createdAt: contact.created_at
          });
        }

        if (!foundExisting && result.current_page < result.last_page) {
          page++;
        } else {
          break;
        }
      }

      // On first poll, just establish the baseline - don't emit all existing contacts
      if (lastSeenId === null) {
        return {
          inputs: [],
          updatedState: { lastSeenId: newLastSeenId }
        };
      }

      return {
        inputs,
        updatedState: { lastSeenId: newLastSeenId ?? lastSeenId }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'contact.created',
        id: String(ctx.input.contactId),
        output: {
          contactId: ctx.input.contactId,
          email: ctx.input.email,
          firstName: ctx.input.firstName,
          lastName: ctx.input.lastName,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
