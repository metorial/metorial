import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newSentEmail = SlateTrigger.create(spec, {
  name: 'New Sent Email',
  key: 'new_sent_email',
  description: 'Triggers when a new newsletter email is sent.'
})
  .input(
    z.object({
      newsletterEmailId: z.string().describe('ID of the sent newsletter email'),
      subject: z.string().describe('Subject line of the email'),
      sentAt: z.string().describe('Date and time the email was sent')
    })
  )
  .output(
    z.object({
      newsletterEmailId: z.string().describe('ID of the sent newsletter email'),
      subject: z.string().describe('Subject line of the email'),
      sentAt: z.string().describe('Date and time the email was sent')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let result = await client.listSentEmails({ offset: 0, limit: 25 });
      let knownIds: string[] = ctx.state?.knownIds ?? [];

      let newEmails = result.emails.filter(e => !knownIds.includes(e.newsletterEmailId));

      let updatedKnownIds = result.emails.map(e => e.newsletterEmailId);

      // On first poll, store all current IDs but don't emit events
      if (knownIds.length === 0) {
        return {
          inputs: [],
          updatedState: { knownIds: updatedKnownIds }
        };
      }

      return {
        inputs: newEmails.map(e => ({
          newsletterEmailId: e.newsletterEmailId,
          subject: e.subject,
          sentAt: e.sentAt
        })),
        updatedState: { knownIds: updatedKnownIds }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'email.sent',
        id: ctx.input.newsletterEmailId,
        output: {
          newsletterEmailId: ctx.input.newsletterEmailId,
          subject: ctx.input.subject,
          sentAt: ctx.input.sentAt
        }
      };
    }
  })
  .build();
