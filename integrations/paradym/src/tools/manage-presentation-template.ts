import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let managePresentationTemplate = SlateTool.create(spec, {
  name: 'Manage Presentation Template',
  key: 'manage_presentation_template',
  description: `Create or update a presentation template that defines what credentials and attributes to request from a holder during verification. Supports SD-JWT VC, mDOC, and AnonCreds credential formats. Each template can request up to 20 credentials with attribute constraints (value, range, type).`,
  instructions: [
    'To create: omit presentationTemplateId. To update: provide the presentationTemplateId.',
    'Each credential in the credentials array should specify a format and type/schema along with requested attributes.'
  ]
})
  .input(
    z.object({
      presentationTemplateId: z
        .string()
        .optional()
        .describe('ID of the template to update (omit to create a new one)'),
      name: z.string().describe('Name of the presentation template'),
      description: z.string().describe('Description shown to the credential holder'),
      credentials: z
        .array(z.record(z.string(), z.any()))
        .describe(
          'Array of credential requests with format, type, attributes, and optional trusted issuers'
        ),
      verifier: z
        .record(z.string(), z.any())
        .optional()
        .describe('Verifier configuration (e.g. { signer: "certificate", keyType: "P-256" })')
    })
  )
  .output(
    z.object({
      presentationTemplateId: z.string().describe('ID of the presentation template'),
      name: z.string().describe('Template name'),
      description: z.string().optional().describe('Template description'),
      createdAt: z.string().optional().describe('ISO 8601 creation timestamp'),
      updatedAt: z.string().optional().describe('ISO 8601 last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      projectId: ctx.config.projectId
    });

    let result: any;
    let action: string;

    if (ctx.input.presentationTemplateId) {
      result = await client.updatePresentationTemplate(ctx.input.presentationTemplateId, {
        name: ctx.input.name,
        description: ctx.input.description,
        credentials: ctx.input.credentials,
        verifier: ctx.input.verifier
      });
      action = 'Updated';
    } else {
      result = await client.createPresentationTemplate({
        name: ctx.input.name,
        description: ctx.input.description,
        credentials: ctx.input.credentials,
        verifier: ctx.input.verifier
      });
      action = 'Created';
    }

    let data = result.data ?? result;

    return {
      output: {
        presentationTemplateId: data.id,
        name: data.name,
        description: data.description,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      },
      message: `${action} presentation template "${data.name}" with ID \`${data.id}\`.`
    };
  })
  .build();
