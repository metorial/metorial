import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newSubmission = SlateTrigger.create(spec, {
  name: 'New Submission',
  key: 'new_submission',
  description:
    'Triggers when a new form submission is received on a Formcarry form. Polls for new submissions periodically.'
})
  .input(
    z.object({
      submissionId: z.string().describe('Unique ID of the submission'),
      formId: z.string().describe('ID of the form the submission belongs to'),
      createdAt: z.string().describe('Timestamp when the submission was created'),
      fields: z.record(z.string(), z.any()).describe('All submitted form field values')
    })
  )
  .output(
    z.object({
      submissionId: z.string().describe('Unique ID of the submission'),
      formId: z.string().describe('ID of the form the submission belongs to'),
      createdAt: z.string().describe('Timestamp when the submission was created'),
      fields: z.record(z.string(), z.any()).describe('All submitted form field values')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let formId = ctx.state?.formId as string | undefined;

      if (!formId) {
        return {
          inputs: [],
          updatedState: ctx.state || {}
        };
      }

      let lastPollTime = ctx.state?.lastPollTime as string | undefined;
      let lastSeenIds = (ctx.state?.lastSeenIds as string[]) || [];

      let result = await client.listSubmissions({
        formId: formId,
        sort: 'createdAt:-1',
        limit: 50
      });

      let newSubmissions = result.submissions.filter(sub => {
        let subId = sub._id || sub.id;
        if (lastSeenIds.includes(subId)) {
          return false;
        }
        if (lastPollTime && sub.createdAt) {
          return sub.createdAt > lastPollTime;
        }
        return !lastPollTime;
      });

      let currentIds = result.submissions.map(sub => sub._id || sub.id).filter(Boolean);
      let now = new Date().toISOString();

      return {
        inputs: newSubmissions.map(sub => {
          let subId = sub._id || sub.id;
          let { _id, id, form, createdAt, updatedAt, __v, ...fields } = sub;
          return {
            submissionId: subId,
            formId: formId!,
            createdAt: createdAt || now,
            fields
          };
        }),
        updatedState: {
          ...ctx.state,
          formId,
          lastPollTime: now,
          lastSeenIds: currentIds.slice(0, 100)
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'submission.created',
        id: ctx.input.submissionId,
        output: {
          submissionId: ctx.input.submissionId,
          formId: ctx.input.formId,
          createdAt: ctx.input.createdAt,
          fields: ctx.input.fields
        }
      };
    }
  });
