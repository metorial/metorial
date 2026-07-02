import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { GoogleFormsClient } from '../lib/client';
import { googleFormsActionScopes } from '../scopes';
import { spec } from '../spec';

export let formUpdated = SlateTrigger.create(spec, {
  name: 'Form Updated',
  key: 'form_updated',
  description:
    "Triggers when a Google Form's content or settings are changed. Detects changes to the form title, description, items, quiz settings, and revision ID by polling the form periodically."
})
  .scopes(googleFormsActionScopes.formUpdated)
  .input(
    z.object({
      formId: z.string().describe('ID of the form that was updated'),
      revisionId: z.string().describe('New revision ID after the update'),
      title: z.string().optional().describe('Current form title'),
      description: z.string().optional().describe('Current form description'),
      isQuiz: z.boolean().optional().describe('Whether the form is a quiz'),
      itemCount: z.number().optional().describe('Number of items in the form')
    })
  )
  .output(
    z.object({
      formId: z.string().describe('ID of the updated form'),
      revisionId: z.string().describe('New revision ID'),
      title: z.string().optional().describe('Current form title'),
      description: z.string().optional().describe('Current form description'),
      responderUri: z.string().optional().describe('URL for respondents'),
      isQuiz: z.boolean().optional().describe('Whether the form is configured as a quiz'),
      itemCount: z.number().optional().describe('Total number of items in the form')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let formId = (ctx.state?.formId as string) || '';
      if (!formId) {
        return { inputs: [], updatedState: ctx.state };
      }

      let client = new GoogleFormsClient(ctx.auth.token);
      let form = await client.getForm(formId);

      let currentRevisionId = form.revisionId || '';
      let previousRevisionId = (ctx.state?.lastRevisionId as string) || '';

      if (currentRevisionId === previousRevisionId) {
        return {
          inputs: [],
          updatedState: {
            formId,
            lastRevisionId: currentRevisionId
          }
        };
      }

      let itemCount = form.items?.length || 0;

      return {
        inputs: [
          {
            formId,
            revisionId: currentRevisionId,
            title: form.info?.title,
            description: form.info?.description,
            isQuiz: form.settings?.quizSettings?.isQuiz,
            itemCount
          }
        ],
        updatedState: {
          formId,
          lastRevisionId: currentRevisionId
        }
      };
    },

    handleEvent: async ctx => {
      let client = new GoogleFormsClient(ctx.auth.token);
      let form = await client.getForm(ctx.input.formId);

      return {
        type: 'form.updated',
        id: `${ctx.input.formId}-${ctx.input.revisionId}`,
        output: {
          formId: ctx.input.formId,
          revisionId: ctx.input.revisionId,
          title: ctx.input.title,
          description: ctx.input.description,
          responderUri: form.responderUri,
          isQuiz: ctx.input.isQuiz,
          itemCount: ctx.input.itemCount
        }
      };
    }
  })
  .build();
