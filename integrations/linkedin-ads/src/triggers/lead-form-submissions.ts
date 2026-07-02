import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let leadFormSubmissions = SlateTrigger.create(spec, {
  name: 'Lead Form Submissions',
  key: 'lead_form_submissions',
  description:
    'Triggers when new lead form submissions are received on LinkedIn Lead Gen Forms. Polls for new submissions periodically.'
})
  .input(
    z.object({
      responseId: z.string().describe('ID of the lead form response'),
      leadFormUrn: z.string().describe('URN of the lead form'),
      submittedAt: z.number().describe('Submission timestamp in epoch milliseconds'),
      answers: z
        .array(
          z.object({
            questionId: z.string().optional(),
            answer: z.string().optional()
          })
        )
        .optional()
        .describe('Submitted answers'),
      associatedEntity: z.string().optional().describe('Associated campaign or creative URN')
    })
  )
  .output(
    z.object({
      responseId: z.string().describe('ID of the lead form response'),
      leadFormUrn: z.string().describe('URN of the lead form'),
      submittedAt: z.number().describe('Submission timestamp in epoch milliseconds'),
      answers: z
        .array(
          z.object({
            questionId: z.string().optional().describe('Question identifier'),
            answer: z.string().optional().describe("User's answer")
          })
        )
        .optional()
        .describe('Submitted answers'),
      associatedEntity: z.string().optional().describe('Associated campaign or creative URN')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let state = ctx.state as { lastPolledAt?: number; accountId?: string } | null;
      let lastPolledAt = state?.lastPolledAt;
      let now = Date.now();

      // accountId should be stored in state from the first poll initialization
      let accountId = state?.accountId;
      if (!accountId) {
        // On first poll, return empty - the trigger needs to be configured with state containing accountId
        return {
          inputs: [],
          updatedState: { lastPolledAt: now, accountId: '' }
        };
      }

      let result = await client.getLeadFormResponses({
        accountId,
        startTime: lastPolledAt,
        endTime: now,
        pageSize: 100
      });

      let inputs = result.elements.map(response => ({
        responseId: response.id,
        leadFormUrn: response.leadForm,
        submittedAt: response.submittedAt,
        answers: response.formResponse?.answers?.map(a => ({
          questionId: a.questionId,
          answer: a.answerDetails?.textQuestionAnswer?.answer
        })),
        associatedEntity: response.associatedEntity
      }));

      return {
        inputs,
        updatedState: {
          lastPolledAt: now,
          accountId
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'lead_form_response.created',
        id: ctx.input.responseId,
        output: {
          responseId: ctx.input.responseId,
          leadFormUrn: ctx.input.leadFormUrn,
          submittedAt: ctx.input.submittedAt,
          answers: ctx.input.answers,
          associatedEntity: ctx.input.associatedEntity
        }
      };
    }
  })
  .build();
