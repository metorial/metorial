import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendTransactionalEmail = SlateTool.create(spec, {
  name: 'Send Transactional Email',
  key: 'send_transactional_email',
  description: `Send a transactional email to a recipient using a pre-built template. Supports dynamic data variables for template personalization and optional file attachments. Can optionally add the recipient as a contact in your audience.`,
  instructions: [
    'Use the List Transactional Emails tool to discover available template IDs and their required data variables.',
    'Data variables must match the variables defined in the template.'
  ],
  constraints: [
    'Attachments must be enabled on your Loops account.',
    'Each attachment must be base64-encoded.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      email: z.string().describe('Recipient email address'),
      transactionalId: z.string().describe('ID of the transactional email template to send'),
      dataVariables: z
        .record(z.string(), z.union([z.string(), z.number()]))
        .optional()
        .describe('Template data variables as key-value pairs for dynamic content'),
      addToAudience: z
        .boolean()
        .optional()
        .describe(
          'If true, creates a contact in your audience for this recipient (defaults to false)'
        ),
      attachments: z
        .array(
          z.object({
            filename: z.string().describe('Name of the attached file'),
            contentType: z
              .string()
              .describe('MIME type of the file (e.g., "application/pdf")'),
            content: z.string().describe('Base64-encoded file content')
          })
        )
        .optional()
        .describe('File attachments to include with the email')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the email was sent successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.sendTransactionalEmail({
      email: ctx.input.email,
      transactionalId: ctx.input.transactionalId,
      dataVariables: ctx.input.dataVariables,
      addToAudience: ctx.input.addToAudience,
      attachments: ctx.input.attachments
    });

    return {
      output: { success: result.success },
      message: `Sent transactional email (template \`${ctx.input.transactionalId}\`) to **${ctx.input.email}**.`
    };
  })
  .build();
