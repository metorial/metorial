import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newFormSubmission = SlateTrigger.create(spec, {
  name: 'New Form Submission',
  key: 'new_form_submission',
  description:
    'Triggers when a new form is submitted to CommCare. Detects new form data including all question responses and submission metadata.'
})
  .input(
    z.object({
      formId: z.string(),
      appId: z.string(),
      receivedOn: z.string(),
      formType: z.string(),
      formData: z.record(z.string(), z.any()),
      submittedBy: z.string(),
      archived: z.boolean()
    })
  )
  .output(
    z.object({
      formId: z.string().describe('Unique identifier of the submitted form'),
      appId: z.string().describe('Application ID the form belongs to'),
      receivedOn: z.string().describe('Timestamp when the form was received (ISO 8601)'),
      formType: z.string().describe('Form type identifier'),
      formData: z.record(z.string(), z.any()).describe('All form question responses and data'),
      submittedBy: z.string().describe('Username of the person who submitted the form'),
      archived: z.boolean().describe('Whether the form is archived')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        domain: ctx.config.domain,
        username: ctx.auth.username,
        token: ctx.auth.token
      });

      let lastReceivedOn = ctx.state?.lastReceivedOn as string | undefined;

      let params: Record<string, any> = {
        limit: 50
      };
      if (lastReceivedOn) {
        params.receivedOnStart = lastReceivedOn;
      }

      let result = await client.listForms(params);

      let existingIds = new Set<string>((ctx.state?.seenIds as string[]) || []);
      let newForms = result.objects.filter(f => !existingIds.has(f.id));

      if (newForms.length === 0) {
        return {
          inputs: [],
          updatedState: ctx.state
        };
      }

      let newLastReceivedOn = lastReceivedOn;
      for (let f of newForms) {
        if (!newLastReceivedOn || f.received_on > newLastReceivedOn) {
          newLastReceivedOn = f.received_on;
        }
      }

      let recentIds = newForms.map(f => f.id);
      let allSeenIds = [...recentIds].slice(-200);

      return {
        inputs: newForms.map(f => ({
          formId: f.id,
          appId: f.app_id,
          receivedOn: f.received_on,
          formType: f.type,
          formData: f.form,
          submittedBy: f.metadata?.username || '',
          archived: f.archived
        })),
        updatedState: {
          lastReceivedOn: newLastReceivedOn,
          seenIds: allSeenIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'form.submitted',
        id: ctx.input.formId,
        output: {
          formId: ctx.input.formId,
          appId: ctx.input.appId,
          receivedOn: ctx.input.receivedOn,
          formType: ctx.input.formType,
          formData: ctx.input.formData,
          submittedBy: ctx.input.submittedBy,
          archived: ctx.input.archived
        }
      };
    }
  })
  .build();
