import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { FormdeskClient } from '../lib/client';
import { spec } from '../spec';

export let newFormSubmission = SlateTrigger.create(spec, {
  name: 'New Form Submission',
  key: 'new_form_submission',
  description:
    'Triggers when a new form submission (result) is created or completed in Formdesk. Polls for new results since the last check and returns the full submission data.'
})
  .input(
    z.object({
      resultId: z.string().describe('The unique ID of the result entry'),
      formName: z.string().describe('The form name this result belongs to'),
      fields: z.record(z.string(), z.any()).describe('All submitted field data'),
      systemFields: z.record(z.string(), z.any()).optional().describe('System metadata fields')
    })
  )
  .output(
    z.object({
      resultId: z.string().describe('The unique ID of the result entry'),
      formName: z.string().describe('The form name this result belongs to'),
      fields: z.record(z.string(), z.any()).describe('All submitted field data'),
      systemFields: z.record(z.string(), z.any()).optional().describe('System metadata fields')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new FormdeskClient({
        token: ctx.auth.token,
        host: ctx.auth.host,
        domain: ctx.auth.domain
      });

      let lastPollTime = ctx.state?.lastPollTime as string | undefined;
      let formNames = ctx.state?.formNames as string[] | undefined;

      // If we don't have form names cached, fetch them
      if (!formNames || formNames.length === 0) {
        let forms = await client.getForms();
        formNames = forms.map((f: any) => String(f.name || f.id || ''));
      }

      let inputs: Array<{
        resultId: string;
        formName: string;
        fields: Record<string, any>;
        systemFields?: Record<string, any>;
      }> = [];

      let newestTimestamp = lastPollTime;

      for (let formName of formNames) {
        try {
          let params: any = {
            formName
          };

          if (lastPollTime) {
            params.completedAfter = lastPollTime;
          }

          let data = await client.getResultIDs(params);
          let resultIds: string[] = [];

          if (Array.isArray(data)) {
            resultIds = data.map((r: any) => String(r.id || r));
          } else if (data?.results) {
            resultIds = data.results.map((r: any) => String(r.id || r));
          }

          for (let resultId of resultIds) {
            try {
              let result = await client.getResult(resultId);

              let fields: Record<string, any> = {};
              let systemFields: Record<string, any> = {};

              if (result && typeof result === 'object') {
                for (let [key, value] of Object.entries(result)) {
                  if (
                    key.startsWith('_') ||
                    [
                      'id',
                      'status',
                      'created',
                      'changed',
                      'completed',
                      'visitor',
                      'ip'
                    ].includes(key)
                  ) {
                    systemFields[key] = value;
                  } else {
                    fields[key] = value;
                  }
                }
              }

              // Track the newest timestamp
              let completedAt =
                systemFields.completed || systemFields.created || systemFields.changed;
              if (completedAt && (!newestTimestamp || completedAt > newestTimestamp)) {
                newestTimestamp = completedAt;
              }

              inputs.push({
                resultId,
                formName,
                fields,
                systemFields: Object.keys(systemFields).length > 0 ? systemFields : undefined
              });
            } catch {
              // Skip individual results that fail to fetch
            }
          }
        } catch {
          // Skip forms that fail to query
        }
      }

      return {
        inputs,
        updatedState: {
          lastPollTime: newestTimestamp || new Date().toISOString(),
          formNames
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'form_submission.created',
        id: ctx.input.resultId,
        output: {
          resultId: ctx.input.resultId,
          formName: ctx.input.formName,
          fields: ctx.input.fields,
          systemFields: ctx.input.systemFields
        }
      };
    }
  })
  .build();
