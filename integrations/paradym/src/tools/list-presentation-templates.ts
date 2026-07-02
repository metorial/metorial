import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listPresentationTemplates = SlateTool.create(spec, {
  name: 'List Presentation Templates',
  key: 'list_presentation_templates',
  description: `Retrieve presentation templates configured in a Paradym project. Presentation templates define what credentials and attributes to request from a holder during verification.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pageSize: z.number().optional().describe('Number of templates to return per page'),
      pageAfter: z.string().optional().describe('Cursor for fetching the next page of results')
    })
  )
  .output(
    z.object({
      templates: z
        .array(
          z.object({
            presentationTemplateId: z.string().describe('ID of the presentation template'),
            name: z.string().describe('Template name'),
            description: z.string().optional().describe('Template description'),
            credentials: z.any().optional().describe('Credential request definitions'),
            createdAt: z.string().optional().describe('ISO 8601 creation timestamp'),
            updatedAt: z.string().optional().describe('ISO 8601 last update timestamp')
          })
        )
        .describe('List of presentation templates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      projectId: ctx.config.projectId
    });

    let result = await client.listPresentationTemplates({
      pageSize: ctx.input.pageSize,
      pageAfter: ctx.input.pageAfter
    });

    let templates = (result.data ?? []).map((t: any) => ({
      presentationTemplateId: t.id,
      name: t.name,
      description: t.description,
      credentials: t.credentials,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt
    }));

    return {
      output: { templates },
      message: `Found **${templates.length}** presentation template(s).`
    };
  })
  .build();
