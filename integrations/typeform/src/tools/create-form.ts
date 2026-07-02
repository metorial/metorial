import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { TypeformClient } from '../lib/client';
import { spec } from '../spec';

let fieldInputSchema = z.object({
  title: z.string().describe('The question text for this field'),
  type: z
    .enum([
      'short_text',
      'long_text',
      'email',
      'date',
      'calendly',
      'contact_info',
      'multiple_choice',
      'dropdown',
      'rating',
      'ranking',
      'opinion_scale',
      'nps',
      'file_upload',
      'number',
      'website',
      'yes_no',
      'legal',
      'statement',
      'picture_choice',
      'phone_number',
      'matrix',
      'multi_format',
      'group',
      'payment'
    ])
    .describe('Field type'),
  ref: z.string().optional().describe('Custom reference for this field (used in logic jumps)'),
  required: z.boolean().optional().describe('Whether this field is required'),
  choices: z
    .array(
      z.object({
        label: z.string().describe('Choice label text'),
        ref: z.string().optional().describe('Custom reference for this choice')
      })
    )
    .optional()
    .describe('Choices for multiple_choice, dropdown, or picture_choice fields'),
  properties: z
    .any()
    .optional()
    .describe(
      'Additional field-specific properties (e.g. allowMultipleSelections, steps for rating, shape for rating)'
    )
});

export let createForm = SlateTool.create(spec, {
  name: 'Create Form',
  key: 'create_form',
  description: `Create a new typeform with specified fields, settings, and optional welcome/thank-you screens. Supports all field types including short text, multiple choice, rating, opinion scale, file upload, and more.`,
  instructions: [
    'Each field must have a **type** and **title** at minimum.',
    'For multiple_choice and dropdown fields, provide an array of **choices**.',
    'Use the **properties** object for field-specific settings like rating steps or scale ranges.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      title: z.string().describe('Form title'),
      workspaceUrl: z
        .string()
        .optional()
        .describe(
          'Workspace API URL to create the form in (e.g. https://api.typeform.com/workspaces/{id})'
        ),
      fields: z.array(fieldInputSchema).min(1).describe('Array of form fields/questions'),
      welcomeScreenTitle: z.string().optional().describe('Title for the welcome screen'),
      welcomeScreenDescription: z
        .string()
        .optional()
        .describe('Description text for the welcome screen'),
      thankYouScreenTitle: z.string().optional().describe('Title for the thank you screen'),
      thankYouScreenMessage: z
        .string()
        .optional()
        .describe('Message for the thank you screen'),
      themeUrl: z.string().optional().describe('Theme API URL to apply to the form'),
      language: z.string().optional().describe('Form language code (e.g. "en", "es", "fr")'),
      hiddenFields: z
        .array(z.string())
        .optional()
        .describe('Hidden field keys to accept via URL parameters')
    })
  )
  .output(
    z.object({
      formId: z.string().describe('ID of the created form'),
      title: z.string().describe('Title of the created form'),
      displayUrl: z.string().optional().describe('Public URL to access the form'),
      fieldCount: z.number().describe('Number of fields in the form')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TypeformClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let formData: Record<string, any> = {
      title: ctx.input.title
    };

    if (ctx.input.language) formData.language = ctx.input.language;
    if (ctx.input.workspaceUrl) formData.workspace = { href: ctx.input.workspaceUrl };
    if (ctx.input.themeUrl) formData.theme = { href: ctx.input.themeUrl };

    formData.fields = ctx.input.fields.map(f => {
      let field: Record<string, any> = {
        title: f.title,
        type: f.type
      };
      if (f.ref) field.ref = f.ref;
      if (f.required !== undefined) {
        field.validations = { required: f.required };
      }
      if (f.choices) {
        field.properties = {
          ...f.properties,
          choices: f.choices.map(c => {
            let choice: Record<string, any> = { label: c.label };
            if (c.ref) choice.ref = c.ref;
            return choice;
          })
        };
      } else if (f.properties) {
        field.properties = f.properties;
      }
      return field;
    });

    if (ctx.input.welcomeScreenTitle) {
      formData.welcome_screens = [
        {
          title: ctx.input.welcomeScreenTitle,
          properties: ctx.input.welcomeScreenDescription
            ? { description: ctx.input.welcomeScreenDescription }
            : undefined
        }
      ];
    }

    if (ctx.input.thankYouScreenTitle) {
      formData.thankyou_screens = [
        {
          title: ctx.input.thankYouScreenTitle,
          properties: ctx.input.thankYouScreenMessage
            ? { description: ctx.input.thankYouScreenMessage }
            : undefined
        }
      ];
    }

    if (ctx.input.hiddenFields && ctx.input.hiddenFields.length > 0) {
      formData.hidden = ctx.input.hiddenFields;
    }

    let result = await client.createForm(formData);

    return {
      output: {
        formId: result.id,
        title: result.title,
        displayUrl: result._links?.display,
        fieldCount: (result.fields || []).length
      },
      message: `Created form **${result.title}** with **${(result.fields || []).length}** fields.${result._links?.display ? ` [Open form](${result._links.display})` : ''}`
    };
  })
  .build();
