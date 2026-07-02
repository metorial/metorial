import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newContact = SlateTrigger.create(spec, {
  name: 'New Contact',
  key: 'new_contact',
  description: 'Triggers when a new contact is added to any list in your Campayn account.'
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact'),
      email: z.string().describe('Email address of the contact'),
      firstName: z.string().nullable().describe('First name'),
      lastName: z.string().nullable().describe('Last name'),
      imageUrl: z.string().describe('Profile image URL'),
      listId: z.string().describe('ID of the list the contact belongs to'),
      listName: z.string().describe('Name of the list')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('ID of the new contact'),
      email: z.string().describe('Email address of the contact'),
      firstName: z.string().nullable().describe('First name'),
      lastName: z.string().nullable().describe('Last name'),
      imageUrl: z.string().describe('Profile image URL'),
      listId: z.string().describe('ID of the list the contact was added to'),
      listName: z.string().describe('Name of the list')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let lists = await client.getLists();

      let previousState = ctx.state as { knownContactKeys: string[] } | null;
      let knownContactKeys = new Set(previousState?.knownContactKeys ?? []);

      let allInputs: {
        contactId: string;
        email: string;
        firstName: string | null;
        lastName: string | null;
        imageUrl: string;
        listId: string;
        listName: string;
      }[] = [];
      let currentKeys: string[] = [];

      for (let list of lists) {
        let contacts = await client.getListContacts(list.id);
        for (let contact of contacts) {
          let key = `${list.id}:${contact.id}`;
          currentKeys.push(key);
          if (!knownContactKeys.has(key)) {
            allInputs.push({
              contactId: contact.id,
              email: contact.email,
              firstName: contact.first_name,
              lastName: contact.last_name,
              imageUrl: contact.image_url,
              listId: list.id,
              listName: list.list_name
            });
          }
        }
      }

      return {
        inputs: allInputs,
        updatedState: {
          knownContactKeys: currentKeys
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'contact.created',
        id: `${ctx.input.listId}:${ctx.input.contactId}`,
        output: {
          contactId: ctx.input.contactId,
          email: ctx.input.email,
          firstName: ctx.input.firstName,
          lastName: ctx.input.lastName,
          imageUrl: ctx.input.imageUrl,
          listId: ctx.input.listId,
          listName: ctx.input.listName
        }
      };
    }
  })
  .build();
