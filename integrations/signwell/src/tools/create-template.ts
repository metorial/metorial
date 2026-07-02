import { SlateTool } from 'slates';
import { z } from 'zod';
import { SignWellClient } from '../lib/client';
import { spec } from '../spec';

let placeholderSchema = z.object({
  id: z.string().describe('Unique identifier for the placeholder'),
  name: z.string().describe('Display name for the placeholder (e.g., "Signer 1", "Client")'),
  signingOrder: z.number().optional().describe('Signing order position')
});

let fileSchema = z.object({
  name: z.string().describe('Name of the file'),
  fileUrl: z.string().optional().describe('Publicly accessible URL to the document file'),
  fileBase64: z.string().optional().describe('Base64-encoded file content')
});

let fieldSchema = z.object({
  type: z.string().describe('Field type: signature, initials, date, text, checkbox, etc.'),
  required: z.boolean().optional().describe('Whether the field is required'),
  x: z.number().describe('X coordinate position on the page'),
  y: z.number().describe('Y coordinate position on the page'),
  page: z.number().describe('Page number (0-indexed)'),
  placeholderId: z.string().describe('ID of the placeholder this field is assigned to'),
  apiId: z.string().optional().describe('Custom API identifier for the field'),
  width: z.number().optional().describe('Width of the field'),
  height: z.number().optional().describe('Height of the field'),
  dateFormat: z.string().optional().describe('Date format for date fields'),
  value: z.string().optional().describe('Default value for the field'),
  fixedWidth: z.boolean().optional().describe('Whether the field has a fixed width'),
  lockSignDate: z.boolean().optional().describe('Whether to lock the sign date')
});

export let createTemplate = SlateTool.create(spec, {
  name: 'Create Template',
  key: 'create_template',
  description: `Create a reusable document template with predefined fields and placeholder recipients. Templates can then be used to generate documents quickly with recipient-specific data.`,
  instructions: [
    'Provide at least one placeholder recipient and at least one file.',
    'Fields reference placeholders by their ID.'
  ],
  constraints: ['Rate limited to 30 template creation requests per minute.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name/title of the template'),
      subject: z
        .string()
        .optional()
        .describe('Default email subject for documents created from this template'),
      message: z
        .string()
        .optional()
        .describe('Default email message for documents created from this template'),
      draft: z.boolean().optional().describe('If true, template is saved as a draft'),
      reminders: z.boolean().optional().describe('Enable automatic reminders'),
      applySigningOrder: z.boolean().optional().describe('Enforce sequential signing order'),
      textTags: z.boolean().optional().describe('Enable text tag parsing'),
      allowDecline: z.boolean().optional().describe('Allow recipients to decline'),
      allowReassign: z.boolean().optional().describe('Allow recipients to reassign'),
      expiresIn: z.number().optional().describe('Default number of days until expiration'),
      files: z.array(fileSchema).optional().describe('Template files'),
      placeholders: z
        .array(placeholderSchema)
        .describe('Placeholder recipients for the template'),
      fields: z
        .array(z.array(fieldSchema))
        .optional()
        .describe('Signing fields grouped by page')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('Unique ID of the created template'),
      name: z.string().optional().describe('Name of the template'),
      isDraft: z.boolean().optional().describe('Whether the template is a draft'),
      placeholders: z
        .array(
          z.object({
            placeholderId: z.string().optional().describe('Placeholder ID'),
            name: z.string().optional().describe('Placeholder name')
          })
        )
        .optional()
        .describe('Template placeholders'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SignWellClient({ token: ctx.auth.token });

    let result = await client.createTemplate({
      ...ctx.input,
      testMode: ctx.config.testMode
    });

    let output = {
      templateId: result.id,
      name: result.name,
      isDraft: result.is_draft,
      placeholders: result.placeholders?.map((p: any) => ({
        placeholderId: p.id,
        name: p.name
      })),
      createdAt: result.created_at
    };

    return {
      output,
      message: `Template **${result.name || result.id}** created with ${ctx.input.placeholders.length} placeholder(s).`
    };
  })
  .build();
