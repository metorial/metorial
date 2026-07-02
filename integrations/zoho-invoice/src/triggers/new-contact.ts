import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newContact = SlateTrigger.create(spec, {
  name: 'New Contact',
  key: 'new_contact',
  description:
    'Triggers when a new contact is created in Zoho Invoice. Polls for recently created contacts.'
})
  .input(
    z.object({
      contactId: z.string(),
      contactName: z.string().optional(),
      companyName: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      contactType: z.string().optional(),
      status: z.string().optional(),
      createdTime: z.string()
    })
  )
  .output(
    z.object({
      contactId: z.string(),
      contactName: z.string().optional(),
      companyName: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      contactType: z.string().optional(),
      status: z.string().optional(),
      createdTime: z.string()
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        organizationId: ctx.config.organizationId,
        region: ctx.auth.region
      });

      let state = ctx.state as { lastCreatedTime?: string } | null;
      let lastCreatedTime = state?.lastCreatedTime;

      let result = await client.listContacts({
        sort_column: 'created_time',
        sort_order: 'D',
        per_page: 25
      });

      let contacts = result.contacts ?? [];
      let inputs: any[] = [];
      let newestCreatedTime = lastCreatedTime;

      for (let contact of contacts) {
        let createdTime = contact.created_time;
        if (!createdTime) continue;
        if (lastCreatedTime && createdTime <= lastCreatedTime) continue;

        inputs.push({
          contactId: contact.contact_id,
          contactName: contact.contact_name,
          companyName: contact.company_name,
          email: contact.email,
          phone: contact.phone,
          contactType: contact.contact_type,
          status: contact.status,
          createdTime
        });

        if (!newestCreatedTime || createdTime > newestCreatedTime) {
          newestCreatedTime = createdTime;
        }
      }

      return {
        inputs,
        updatedState: {
          lastCreatedTime: newestCreatedTime || lastCreatedTime
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'contact.created',
        id: ctx.input.contactId,
        output: {
          contactId: ctx.input.contactId,
          contactName: ctx.input.contactName,
          companyName: ctx.input.companyName,
          email: ctx.input.email,
          phone: ctx.input.phone,
          contactType: ctx.input.contactType,
          status: ctx.input.status,
          createdTime: ctx.input.createdTime
        }
      };
    }
  })
  .build();
