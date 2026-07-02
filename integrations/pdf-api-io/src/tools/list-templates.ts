import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `Retrieve all PDF templates available in your account. Returns each template's name, type, creation date, and the dynamic variables it expects. Useful for discovering which templates are available and what data they require before generating PDFs.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      templates: z
        .array(
          z.object({
            templateId: z.string().describe('Unique identifier of the template'),
            name: z.string().describe('Human-readable name of the template'),
            type: z.string().describe('Template type: "editor" or "html"'),
            createdAt: z
              .string()
              .describe('ISO 8601 timestamp of when the template was created'),
            meta: z
              .record(z.string(), z.unknown())
              .describe('Additional metadata about the template'),
            variables: z
              .array(
                z.object({
                  name: z.string().describe('Variable placeholder name'),
                  type: z.string().describe('Expected data type for the variable')
                })
              )
              .describe('Dynamic variables defined in the template')
          })
        )
        .describe('List of available templates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let templates = await client.listTemplates();

    let mapped = templates.map(t => ({
      templateId: t.id,
      name: t.name,
      type: t.type,
      createdAt: t.created_at,
      meta: t.meta as Record<string, unknown>,
      variables: t.variables.map(v => ({
        name: v.name,
        type: v.type
      }))
    }));

    return {
      output: { templates: mapped },
      message: `Found **${mapped.length}** template(s).`
    };
  })
  .build();
