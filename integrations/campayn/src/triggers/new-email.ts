import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newEmail = SlateTrigger.create(spec, {
  name: 'New Email Campaign',
  key: 'new_email',
  description: 'Triggers when a new email campaign is created or sent.'
})
  .input(
    z.object({
      emailId: z.string().describe('ID of the email'),
      name: z.string().describe('Email name/subject'),
      status: z.string().describe('Email status'),
      scheduledDate: z.string().nullable().describe('Scheduled send date'),
      campaignTitle: z.string().nullable().describe('Associated campaign title')
    })
  )
  .output(
    z.object({
      emailId: z.string().describe('ID of the email campaign'),
      name: z.string().describe('Email name/subject'),
      status: z.string().describe('Email status (e.g. delivered, incomplete)'),
      scheduledDate: z.string().nullable().describe('Scheduled send date'),
      campaignTitle: z.string().nullable().describe('Associated campaign title')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let emails = await client.getEmails();

      let knownEmailIds: string[] = (ctx.state?.knownEmailIds as string[]) ?? [];
      let knownSet = new Set(knownEmailIds);

      let newEmails = emails.filter(e => !knownSet.has(e.id));
      let allEmailIds = emails.map(e => e.id);

      return {
        inputs: newEmails.map(e => ({
          emailId: e.id,
          name: e.name,
          status: e.status,
          scheduledDate: e.scheduled_date,
          campaignTitle: e.campaign_title
        })),
        updatedState: {
          knownEmailIds: allEmailIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'email.created',
        id: ctx.input.emailId,
        output: {
          emailId: ctx.input.emailId,
          name: ctx.input.name,
          status: ctx.input.status,
          scheduledDate: ctx.input.scheduledDate,
          campaignTitle: ctx.input.campaignTitle
        }
      };
    }
  })
  .build();
