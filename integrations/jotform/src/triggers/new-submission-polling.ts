import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newSubmissionPollingTrigger = SlateTrigger.create(spec, {
  name: 'New Submission',
  key: 'new_submission',
  description:
    '[Polling fallback] Polls for new form submissions at regular intervals. Detects both UI and API-created submissions. Can monitor a specific form or all forms in the account.',
  instructions: [
    'Unlike the webhook trigger, this polling trigger also captures submissions created via the API.'
  ]
})
  .input(
    z.object({
      submissionId: z.string().describe('ID of the new submission'),
      formId: z.string().describe('ID of the form the submission belongs to'),
      createdAt: z.string().describe('Submission creation timestamp'),
      status: z.string().describe('Submission status'),
      answers: z.record(z.string(), z.any()).describe('Map of question IDs to answer objects')
    })
  )
  .output(
    z.object({
      submissionId: z.string().describe('Unique submission identifier'),
      formId: z.string().describe('ID of the form this submission belongs to'),
      createdAt: z.string().describe('When the submission was created'),
      updatedAt: z.string().optional().describe('When the submission was last updated'),
      status: z.string().describe('Submission status (ACTIVE, DELETED, etc.)'),
      ip: z.string().optional().describe('Submitter IP address'),
      answers: z.record(z.string(), z.any()).describe('Map of question IDs to answer objects')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        apiDomain: ctx.config.apiDomain
      });

      let lastTimestamp: string | null = ctx.state?.lastTimestamp || null;
      let lastSeenIds: string[] = ctx.state?.lastSeenIds || [];

      let filter: Record<string, any> = {};
      if (lastTimestamp) {
        filter['created_at:gt'] = lastTimestamp;
      }

      let submissions = await client.listAllSubmissions({
        orderby: 'created_at',
        direction: 'DESC',
        limit: 100,
        filter: Object.keys(filter).length > 0 ? filter : undefined
      });

      let newSubmissions = (submissions || []).filter(
        (s: any) => !lastSeenIds.includes(String(s.id))
      );

      let inputs = newSubmissions.map((s: any) => ({
        submissionId: String(s.id),
        formId: String(s.form_id),
        createdAt: s.created_at || '',
        status: s.status || '',
        answers: s.answers || {}
      }));

      let newLastTimestamp = lastTimestamp;
      if (newSubmissions.length > 0) {
        newLastTimestamp = newSubmissions[0].created_at || lastTimestamp;
      }

      let newSeenIds = newSubmissions.map((s: any) => String(s.id));
      let combinedIds = [...newSeenIds, ...lastSeenIds].slice(0, 200);

      return {
        inputs,
        updatedState: {
          lastTimestamp: newLastTimestamp,
          lastSeenIds: combinedIds
        }
      };
    },

    handleEvent: async ctx => {
      let answers = ctx.input.answers;
      if (!answers || Object.keys(answers).length === 0) {
        try {
          let client = new Client({
            token: ctx.auth.token,
            apiDomain: ctx.config.apiDomain
          });
          let full = await client.getSubmission(ctx.input.submissionId);
          answers = full.answers || {};
        } catch {
          // Use what we have
        }
      }

      return {
        type: 'submission.created',
        id: ctx.input.submissionId,
        output: {
          submissionId: ctx.input.submissionId,
          formId: ctx.input.formId,
          createdAt: ctx.input.createdAt,
          updatedAt: undefined,
          status: ctx.input.status,
          ip: undefined,
          answers
        }
      };
    }
  })
  .build();
