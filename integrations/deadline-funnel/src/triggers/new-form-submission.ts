import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { DeadlineFunnelClient } from '../lib/client';
import { spec } from '../spec';

export let newFormSubmission = SlateTrigger.create(spec, {
  name: 'New ConvertHub Form Submission',
  key: 'new_converthub_form_submission',
  description:
    'Triggers when a new subscriber submits a ConvertHub opt-in form in Deadline Funnel.'
})
  .input(
    z.object({
      submissionId: z.string().describe('Unique identifier of the form submission'),
      portalId: z.string().describe('ID of the portal the form belongs to'),
      email: z.string().describe('Email address of the subscriber'),
      subscriberName: z.string().describe('Name of the subscriber'),
      createdAt: z.string().describe('When the form was submitted')
    })
  )
  .output(
    z.object({
      submissionId: z.string().describe('Unique identifier of the form submission'),
      portalId: z.string().describe('ID of the portal the form belongs to'),
      email: z.string().describe('Email address of the subscriber'),
      subscriberName: z.string().describe('Name of the subscriber'),
      createdAt: z.string().describe('When the form was submitted')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new DeadlineFunnelClient({ token: ctx.auth.token });
      let lastTimestamp = (ctx.state as any)?.lastTimestamp || '';

      let submissions = await client.listFormSubmissions({
        since: lastTimestamp || undefined
      });

      let inputs = submissions.map(s => ({
        submissionId: s.submissionId,
        portalId: s.portalId,
        email: s.email,
        subscriberName: s.name,
        createdAt: s.createdAt
      }));

      let newLastTimestamp =
        submissions.length > 0 ? submissions[0]!.createdAt : lastTimestamp;

      return {
        inputs,
        updatedState: {
          lastTimestamp: newLastTimestamp
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'form_submission.created',
        id: ctx.input.submissionId,
        output: {
          submissionId: ctx.input.submissionId,
          portalId: ctx.input.portalId,
          email: ctx.input.email,
          subscriberName: ctx.input.subscriberName,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
