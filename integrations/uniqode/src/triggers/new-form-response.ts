import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { BeaconstacClient } from '../lib/client';
import { spec } from '../spec';

export let newFormResponse = SlateTrigger.create(spec, {
  name: 'New Form Response',
  key: 'new_form_response',
  description:
    'Triggers when a new form response is submitted through a feedback form linked to a campaign. Polls for new submissions on the specified form.'
})
  .input(
    z.object({
      responseId: z.string().describe('Unique response identifier'),
      formId: z.number().describe('Form ID the response belongs to'),
      responseData: z.record(z.string(), z.unknown()).describe('Full response data'),
      submittedAt: z.string().optional().describe('Submission timestamp')
    })
  )
  .output(
    z.object({
      responseId: z.string().describe('Unique response identifier'),
      formId: z.number().describe('Form ID'),
      responseData: z
        .record(z.string(), z.unknown())
        .describe('Complete form response data including all field values'),
      submittedAt: z.string().optional().describe('Submission timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new BeaconstacClient({
        token: ctx.auth.token,
        organizationId: ctx.config.organizationId
      });

      let state = ctx.state as Record<string, unknown>;
      let lastSeenCount = (state?.lastSeenCount as number) ?? 0;

      // Poll all forms and collect new responses
      let formsResult = await client.listForms({ limit: 50 });
      let allInputs: Array<{
        responseId: string;
        formId: number;
        responseData: Record<string, unknown>;
        submittedAt: string | undefined;
      }> = [];

      let formResponseCounts: Record<string, number> =
        (state?.formResponseCounts as Record<string, number>) ?? {};

      for (let form of formsResult.results) {
        let responsesResult = await client.listFormResponses(form.id, { limit: 10 });
        let previousCount = formResponseCounts[String(form.id)] ?? 0;

        if (responsesResult.count > previousCount) {
          let newResponses = responsesResult.results.slice(
            0,
            responsesResult.count - previousCount
          );
          for (let response of newResponses) {
            let responseId =
              (response.id as string | number) ?? `${form.id}-${responsesResult.count}`;
            allInputs.push({
              responseId: String(responseId),
              formId: form.id,
              responseData: response,
              submittedAt: response.created as string | undefined
            });
          }
        }

        formResponseCounts[String(form.id)] = responsesResult.count;
      }

      return {
        inputs: allInputs,
        updatedState: {
          lastSeenCount: lastSeenCount + allInputs.length,
          formResponseCounts
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'form_response.created',
        id: ctx.input.responseId,
        output: {
          responseId: ctx.input.responseId,
          formId: ctx.input.formId,
          responseData: ctx.input.responseData,
          submittedAt: ctx.input.submittedAt
        }
      };
    }
  })
  .build();
