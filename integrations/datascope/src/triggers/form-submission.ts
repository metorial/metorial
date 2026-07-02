import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let formSubmission = SlateTrigger.create(spec, {
  name: 'Form Submission',
  key: 'form_submission',
  description:
    'Triggers when a form is submitted in DataScope. Configure the webhook URL in your DataScope Integrations > Webhooks section, selecting the desired form and pasting the provided webhook URL.'
})
  .input(
    z.object({
      formName: z.string().optional().describe('Name of the submitted form'),
      formCode: z.string().optional().describe('Unique code of the form submission'),
      latitude: z.number().optional().describe('GPS latitude where form was completed'),
      longitude: z.number().optional().describe('GPS longitude where form was completed'),
      questions: z
        .array(
          z.object({
            questionName: z.string().optional().describe('Name of the question'),
            sectionLabel: z.string().optional().describe('Section label of the question'),
            questionValue: z.any().optional().describe('Answer value'),
            questionType: z.string().optional().describe('Type of the question'),
            questionId: z.string().optional().describe('Internal question ID')
          })
        )
        .optional()
        .describe('Array of question/answer data from the submission'),
      raw: z.any().optional().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      formName: z.string().describe('Name of the submitted form'),
      formCode: z.string().describe('Unique code identifying this submission'),
      latitude: z.number().optional().describe('GPS latitude where the form was completed'),
      longitude: z.number().optional().describe('GPS longitude where the form was completed'),
      questions: z
        .array(
          z.object({
            questionName: z.string().describe('Name of the question'),
            sectionLabel: z.string().optional().describe('Section label'),
            questionValue: z.any().describe('Answer value'),
            questionType: z.string().optional().describe('Question type'),
            questionId: z.string().optional().describe('Internal question ID')
          })
        )
        .describe('All question/answer pairs from the submission')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      // DataScope sends form data as a JSON payload with form_name, form_code,
      // latitude, longitude, and question/answer arrays
      let questions: Array<{
        questionName?: string;
        sectionLabel?: string;
        questionValue?: any;
        questionType?: string;
        questionId?: string;
      }> = [];

      // The webhook payload may contain questions as an array or as individual fields
      if (Array.isArray(data.questions)) {
        questions = data.questions.map((q: any) => ({
          questionName: q.question_name ?? q.name,
          sectionLabel: q.section_label ?? q.section,
          questionValue: q.question_value ?? q.value ?? q.answer,
          questionType: q.question_type ?? q.type,
          questionId: q.question_id != null ? String(q.question_id) : undefined
        }));
      }

      let formCode = data.form_code ?? data.code ?? '';
      let formName = data.form_name ?? data.name ?? '';

      return {
        inputs: [
          {
            formName,
            formCode,
            latitude: data.latitude != null ? Number(data.latitude) : undefined,
            longitude: data.longitude != null ? Number(data.longitude) : undefined,
            questions,
            raw: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let input = ctx.input;

      return {
        type: 'form.submitted',
        id: input.formCode || `submission-${Date.now()}`,
        output: {
          formName: input.formName ?? '',
          formCode: input.formCode ?? '',
          latitude: input.latitude,
          longitude: input.longitude,
          questions: (input.questions ?? []).map(q => ({
            questionName: q.questionName ?? '',
            sectionLabel: q.sectionLabel,
            questionValue: q.questionValue,
            questionType: q.questionType,
            questionId: q.questionId
          }))
        }
      };
    }
  })
  .build();
