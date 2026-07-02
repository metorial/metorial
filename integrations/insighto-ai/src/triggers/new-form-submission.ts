import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newFormSubmission = SlateTrigger.create(spec, {
  name: 'New Form Submission',
  key: 'new_form_submission',
  description:
    'Triggers when a new form is captured during an AI agent interaction. Polls for new captured form responses across all forms.'
})
  .input(
    z.object({
      capturedFormId: z.string(),
      formId: z.string(),
      formName: z.string().optional(),
      submittedData: z.record(z.string(), z.unknown()).optional(),
      contactId: z.string().optional(),
      conversationId: z.string().optional(),
      createdAt: z.string().optional()
    })
  )
  .output(
    z.object({
      capturedFormId: z.string(),
      formId: z.string(),
      formName: z.string().optional(),
      submittedData: z.record(z.string(), z.unknown()).optional(),
      contactId: z.string().optional(),
      conversationId: z.string().optional(),
      createdAt: z.string().optional()
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let formsResult = await client.listForms({ page: 1, size: 100 });
      let formItems = formsResult.data || formsResult.items || formsResult;
      let forms = Array.isArray(formItems) ? formItems : [];

      let knownIds: string[] = ctx.state?.knownIds || [];
      let allNewSubmissions: any[] = [];

      for (let form of forms) {
        try {
          let capturedResult = await client.listCapturedForms(form.id);
          let captured = capturedResult.data || capturedResult.items || capturedResult;
          let capturedList = Array.isArray(captured) ? captured : [];

          for (let submission of capturedList) {
            if (!knownIds.includes(submission.id)) {
              allNewSubmissions.push({
                capturedFormId: submission.id,
                formId: form.id,
                formName: form.name,
                submittedData:
                  submission.data || submission.captured_data || submission.fields,
                contactId: submission.contact_id,
                conversationId: submission.conversation_id,
                createdAt: submission.created_at
              });
            }
          }
        } catch {
          // Skip forms that fail to fetch
        }
      }

      let newKnownIds = [...allNewSubmissions.map(s => s.capturedFormId), ...knownIds].slice(
        0,
        500
      );

      return {
        inputs: allNewSubmissions,
        updatedState: {
          knownIds: newKnownIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'form.submitted',
        id: ctx.input.capturedFormId,
        output: {
          capturedFormId: ctx.input.capturedFormId,
          formId: ctx.input.formId,
          formName: ctx.input.formName,
          submittedData: ctx.input.submittedData,
          contactId: ctx.input.contactId,
          conversationId: ctx.input.conversationId,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
