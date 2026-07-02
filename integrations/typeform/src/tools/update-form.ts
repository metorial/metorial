import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { TypeformClient } from '../lib/client';
import { typeformServiceError } from '../lib/errors';
import { spec } from '../spec';

export let updateForm = SlateTool.create(spec, {
  name: 'Update Form',
  key: 'update_form',
  description: `Update an existing typeform. Performs a full replacement of the form definition. Retrieve the current form first with **Get Form**, modify the desired properties, and pass the complete form data here.`,
  instructions: [
    'This performs a **full PUT** update — all fields, screens, and settings must be included or they will be removed.',
    'Use **Get Form** first to retrieve the current definition, then modify what you need.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      formId: z.string().describe('ID of the form to update'),
      title: z.string().optional().describe('Updated form title'),
      fields: z
        .array(z.any())
        .min(1)
        .optional()
        .describe('Complete array of field definitions, including existing field IDs'),
      welcomeScreens: z.array(z.any()).optional().describe('Welcome screens array'),
      thankYouScreens: z.array(z.any()).optional().describe('Thank-you screens array'),
      themeUrl: z.string().optional().describe('Theme API URL to apply'),
      hiddenFields: z.array(z.string()).optional().describe('Hidden field keys'),
      settings: z.any().optional().describe('Form settings object'),
      logic: z.array(z.any()).optional().describe('Logic jump rules'),
      variables: z.any().optional().describe('Variables configuration')
    })
  )
  .output(
    z.object({
      formId: z.string().describe('ID of the updated form'),
      title: z.string().describe('Updated form title'),
      fieldCount: z.number().describe('Number of fields after update'),
      displayUrl: z.string().optional().describe('Public form URL')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.title || !ctx.input.fields) {
      throw typeformServiceError(
        'Update Form uses Typeform PUT and requires a complete title and fields array. Use Patch Form for title, status, theme, workspace, or tracking changes.'
      );
    }

    let client = new TypeformClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let formData: Record<string, any> = {};

    if (ctx.input.title) formData.title = ctx.input.title;
    if (ctx.input.fields) formData.fields = ctx.input.fields;
    if (ctx.input.welcomeScreens) formData.welcome_screens = ctx.input.welcomeScreens;
    if (ctx.input.thankYouScreens) formData.thankyou_screens = ctx.input.thankYouScreens;
    if (ctx.input.themeUrl) formData.theme = { href: ctx.input.themeUrl };
    if (ctx.input.hiddenFields) formData.hidden = ctx.input.hiddenFields;
    if (ctx.input.settings) formData.settings = ctx.input.settings;
    if (ctx.input.logic) formData.logic = ctx.input.logic;
    if (ctx.input.variables) formData.variables = ctx.input.variables;

    let result = await client.updateForm(ctx.input.formId, formData);

    return {
      output: {
        formId: result.id,
        title: result.title,
        fieldCount: (result.fields || []).length,
        displayUrl: result._links?.display
      },
      message: `Updated form **${result.title}** (${result.id}).`
    };
  })
  .build();
