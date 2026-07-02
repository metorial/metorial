import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { CabinPandaClient } from '../lib/client';
import { spec } from '../spec';

export let newSubmission = SlateTrigger.create(spec, {
  name: 'New Form Submission',
  key: 'new_submission',
  description:
    "Triggers when a new submission is received on any of the account's forms. Polls all forms for new submissions periodically."
})
  .input(
    z.object({
      submissionId: z.string().describe('Unique identifier for the submission'),
      formId: z.string().describe('ID of the form the submission belongs to'),
      formName: z.string().optional().describe('Name of the form'),
      createdAt: z.string().optional().describe('When the submission was received'),
      fields: z.any().optional().describe('Submitted field values'),
      raw: z.any().optional().describe('Full submission object')
    })
  )
  .output(
    z.object({
      submissionId: z.string().describe('Unique identifier for the submission'),
      formId: z.string().describe('ID of the form the submission belongs to'),
      formName: z.string().optional().describe('Name of the form'),
      createdAt: z.string().optional().describe('When the submission was received'),
      fields: z.any().optional().describe('Submitted field values'),
      raw: z.any().optional().describe('Full submission object')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new CabinPandaClient({ token: ctx.auth.token });

      let knownIds: string[] = ctx.state?.knownSubmissionIds ?? [];
      let knownSet = new Set(knownIds);

      let forms = await client.listForms();
      let formsList = Array.isArray(forms) ? forms : [];

      let newInputs: Array<{
        submissionId: string;
        formId: string;
        formName?: string;
        createdAt?: string;
        fields?: any;
        raw?: any;
      }> = [];

      let allCurrentIds: string[] = [];

      for (let form of formsList) {
        let formId = form?.key ?? form?.id?.toString();
        if (!formId) continue;

        let formName = form?.name;

        try {
          let submissions = await client.listSubmissions(formId);
          let submissionsList = Array.isArray(submissions) ? submissions : [];

          for (let sub of submissionsList) {
            let subId = sub?.id?.toString();
            if (!subId) continue;

            allCurrentIds.push(subId);

            if (!knownSet.has(subId)) {
              newInputs.push({
                submissionId: subId,
                formId,
                formName,
                createdAt: sub?.created_at,
                fields: sub?.fields ?? sub?.data,
                raw: sub
              });
            }
          }
        } catch {
          // Skip forms that fail to fetch submissions
        }
      }

      // On first poll, don't emit existing submissions as new events
      if (knownIds.length === 0) {
        return {
          inputs: [],
          updatedState: {
            knownSubmissionIds: allCurrentIds
          }
        };
      }

      return {
        inputs: newInputs,
        updatedState: {
          knownSubmissionIds: allCurrentIds
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
          formName: ctx.input.formName,
          createdAt: ctx.input.createdAt,
          fields: ctx.input.fields,
          raw: ctx.input.raw
        }
      };
    }
  })
  .build();
