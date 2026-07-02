import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generatePass = SlateTool.create(spec, {
  name: 'Generate Pass',
  key: 'generate_pass',
  description: `Generate a new mobile wallet pass from a template. Each generated pass receives a unique serial number. Provide either a template ID or template name along with placeholder values to personalize the pass.`,
  instructions: [
    'Provide either templateId or templateName, not both. If both are provided, templateId takes precedence.',
    'The values object should contain key-value pairs matching the template placeholder fields.'
  ]
})
  .input(
    z.object({
      templateId: z.number().optional().describe('ID of the template to generate a pass from'),
      templateName: z
        .string()
        .optional()
        .describe('Name of the template to generate a pass from (alternative to templateId)'),
      values: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          'Placeholder values to personalize the pass (e.g., { "firstName": "John", "lastName": "Doe" })'
        )
    })
  )
  .output(
    z.object({
      serialNumber: z.string().describe('Unique serial number of the generated pass'),
      passTypeIdentifier: z.string().describe('Pass type identifier'),
      distributionUrl: z.string().describe('Short URL to download/share the pass')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let passValues = ctx.input.values || {};

    let result: any;
    if (ctx.input.templateId) {
      result = await client.createPassFromTemplate(ctx.input.templateId, passValues);
    } else if (ctx.input.templateName) {
      result = await client.createPassFromTemplateName(ctx.input.templateName, passValues);
    } else {
      throw new Error('Either templateId or templateName must be provided.');
    }

    return {
      output: {
        serialNumber: result.serialNumber,
        passTypeIdentifier: result.passTypeIdentifier,
        distributionUrl: result.url
      },
      message: `Generated pass **${result.serialNumber}** — [Download](${result.url})`
    };
  })
  .build();
