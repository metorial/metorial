import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createTemplate = SlateTool.create(spec, {
  name: 'Create Template',
  key: 'create_template',
  description: `Create a new Fomo notification template (event type). Templates define the display format for notifications using variable placeholders like \`{{ first_name }}\`, \`{{ city }}\`, \`{{ title_with_link }}\`, and \`{{ time_ago }}\`. Useful for building 3rd-party Fomo integrations.`,
  instructions: [
    'Template messages support variable placeholders: {{ first_name }}, {{ city }}, {{ title }}, {{ title_with_link }}, {{ time_ago }}, and any custom event field keys.',
    'Example message: "{{ first_name }} from {{ city }} just purchased {{ title_with_link }} {{ time_ago }}"'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z
        .string()
        .describe('Friendly name for the template (e.g., "New Order", "New Lead").'),
      message: z
        .string()
        .describe(
          'Template message with variable placeholders (e.g., "{{ first_name }} from {{ city }} just purchased {{ title_with_link }}").'
        ),
      markdownEnabled: z
        .boolean()
        .optional()
        .describe('Enable markdown-flavored syntax in the template (default: false).'),
      imageUrl: z.string().optional().describe('Fallback image URL, ideally under 50kb.'),
      useAvatar: z
        .boolean()
        .optional()
        .describe('Use Gravatar avatar from email_address (default: false).'),
      useIpMapping: z
        .boolean()
        .optional()
        .describe('Convert IP address to city/state/country automatically (default: false).')
    })
  )
  .output(
    z.object({
      templateId: z.number().optional().describe('Unique ID of the created template.'),
      eventTypeTag: z.string().optional().describe('Auto-generated tag for the template.'),
      name: z.string().optional().describe('Template name.'),
      message: z.string().optional().describe('Template message pattern.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let template = await client.createTemplate(ctx.input);

    return {
      output: {
        templateId: template.templateId,
        eventTypeTag: template.eventTypeTag,
        name: template.name,
        message: template.message
      },
      message: `Created template **#${template.templateId}** "${template.name}"${template.eventTypeTag ? ` (tag: "${template.eventTypeTag}")` : ''}.`
    };
  })
  .build();
