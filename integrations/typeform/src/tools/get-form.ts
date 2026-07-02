import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { TypeformClient } from '../lib/client';
import { spec } from '../spec';

let fieldSchema = z.object({
  fieldId: z.string().describe('Field ID'),
  title: z.string().describe('Field title/question text'),
  type: z.string().describe('Field type (e.g. short_text, multiple_choice, rating, etc.)'),
  ref: z.string().optional().describe('Field reference for logic jumps'),
  required: z.boolean().optional().describe('Whether the field is required'),
  choices: z
    .array(
      z.object({
        choiceId: z.string().optional().describe('Choice ID'),
        label: z.string().describe('Choice label'),
        ref: z.string().optional().describe('Choice reference')
      })
    )
    .optional()
    .describe('Available choices for multiple choice / dropdown fields'),
  properties: z.any().optional().describe('Field-specific properties')
});

export let getForm = SlateTool.create(spec, {
  name: 'Get Form',
  key: 'get_form',
  description: `Retrieve the full definition of a typeform including all fields, settings, logic jumps, welcome/thank-you screens, and theme. Use this to inspect a form's structure before updating it or retrieving responses.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      formId: z.string().describe('The unique form ID (found in the form URL)')
    })
  )
  .output(
    z.object({
      formId: z.string().describe('Unique form ID'),
      title: z.string().describe('Form title'),
      language: z.string().optional().describe('Form language code'),
      fields: z.array(fieldSchema).describe('Form fields/questions'),
      welcomeScreens: z
        .array(
          z.object({
            title: z.string().optional().describe('Welcome screen title'),
            ref: z.string().optional().describe('Welcome screen reference')
          })
        )
        .optional()
        .describe('Welcome screens'),
      thankYouScreens: z
        .array(
          z.object({
            title: z.string().optional().describe('Thank you screen title'),
            ref: z.string().optional().describe('Thank you screen reference')
          })
        )
        .optional()
        .describe('Thank you screens'),
      hiddenFields: z.array(z.string()).optional().describe('Hidden field keys'),
      themeUrl: z.string().optional().describe('URL of the applied theme'),
      workspaceUrl: z
        .string()
        .optional()
        .describe('URL of the workspace containing this form'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      lastUpdatedAt: z.string().optional().describe('Last update timestamp'),
      displayUrl: z.string().optional().describe('Public form URL')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TypeformClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let form = await client.getForm(ctx.input.formId);

    let fields = (form.fields || []).map((f: any) => ({
      fieldId: f.id,
      title: f.title,
      type: f.type,
      ref: f.ref,
      required: f.validations?.required,
      choices: f.properties?.choices?.map((c: any) => ({
        choiceId: c.id,
        label: c.label,
        ref: c.ref
      })),
      properties: f.properties
    }));

    let welcomeScreens = (form.welcome_screens || []).map((s: any) => ({
      title: s.title,
      ref: s.ref
    }));

    let thankYouScreens = (form.thankyou_screens || []).map((s: any) => ({
      title: s.title,
      ref: s.ref
    }));

    let hiddenFields = form.hidden
      ? Array.isArray(form.hidden)
        ? form.hidden
        : Object.keys(form.hidden)
      : undefined;

    return {
      output: {
        formId: form.id,
        title: form.title,
        language: form.language,
        fields,
        welcomeScreens,
        thankYouScreens,
        hiddenFields,
        themeUrl: form.theme?.href,
        workspaceUrl: form.workspace?.href,
        createdAt: form.created_at,
        lastUpdatedAt: form.last_updated_at,
        displayUrl: form._links?.display
      },
      message: `Retrieved form **${form.title}** with **${fields.length}** fields.`
    };
  })
  .build();
