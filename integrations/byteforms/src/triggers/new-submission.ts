import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newSubmissionTrigger = SlateTrigger.create(spec, {
  name: 'New Form Submission',
  key: 'new_form_submission',
  description:
    'Triggers when a new submission is received on any ByteForms form associated with your account. Polls for new submissions based on creation timestamp.'
})
  .input(
    z.object({
      submissionId: z.number().describe('Unique identifier of the submission'),
      formId: z.number().describe('ID of the form this submission belongs to'),
      formName: z.string().describe('Name of the form this submission belongs to'),
      responses: z.record(z.string(), z.any()).describe('Submission data as key-value pairs'),
      ip: z.string().optional().describe('IP address of the submitter'),
      createdAt: z.string().describe('ISO timestamp when the submission was created'),
      updatedAt: z.string().describe('ISO timestamp when the submission was last updated')
    })
  )
  .output(
    z.object({
      submissionId: z.number().describe('Unique identifier of the submission'),
      formId: z.number().describe('ID of the form this submission belongs to'),
      formName: z.string().describe('Name of the form this submission belongs to'),
      responses: z.record(z.string(), z.any()).describe('Submission data as key-value pairs'),
      ip: z.string().optional().describe('IP address of the submitter'),
      createdAt: z.string().describe('ISO timestamp when the submission was created'),
      updatedAt: z.string().describe('ISO timestamp when the submission was last updated')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let state = (ctx.state ?? {}) as Record<string, any>;
      let lastSeenTimestamp = state.lastSeenTimestamp as string | undefined;

      let formsResult = await client.listForms();
      if (formsResult.data.length === 0) {
        return {
          inputs: [],
          updatedState: { lastSeenTimestamp }
        };
      }

      let formNameMap = new Map<number, string>();
      for (let form of formsResult.data) {
        formNameMap.set(form.id, form.name);
      }

      let allNewSubmissions: Array<{
        submissionId: number;
        formId: number;
        formName: string;
        responses: Record<string, any>;
        ip?: string;
        createdAt: string;
        updatedAt: string;
      }> = [];

      for (let form of formsResult.data) {
        let result = await client.listFormResponses(String(form.id), {
          order: 'desc',
          limit: 50
        });

        let newSubmissions = result.data.filter(submission => {
          if (!lastSeenTimestamp) return true;
          return (
            new Date(submission.created_at).getTime() > new Date(lastSeenTimestamp).getTime()
          );
        });

        for (let submission of newSubmissions) {
          allNewSubmissions.push({
            submissionId: submission.id,
            formId: submission.form_id,
            formName: formNameMap.get(submission.form_id) ?? `Form ${submission.form_id}`,
            responses: submission.response,
            ip: submission.options?.ip as string | undefined,
            createdAt: submission.created_at,
            updatedAt: submission.updated_at
          });
        }
      }

      // Sort all submissions by created_at descending to find the latest timestamp
      allNewSubmissions.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      let updatedTimestamp = lastSeenTimestamp;
      if (allNewSubmissions.length > 0) {
        updatedTimestamp = allNewSubmissions[0]!.createdAt;
      }

      return {
        inputs: allNewSubmissions,
        updatedState: {
          lastSeenTimestamp: updatedTimestamp
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'submission.created',
        id: String(ctx.input.submissionId),
        output: {
          submissionId: ctx.input.submissionId,
          formId: ctx.input.formId,
          formName: ctx.input.formName,
          responses: ctx.input.responses,
          ip: ctx.input.ip,
          createdAt: ctx.input.createdAt,
          updatedAt: ctx.input.updatedAt
        }
      };
    }
  })
  .build();
