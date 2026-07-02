import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import { requireNonEmptyString } from './shared';

export let getTemplate = SlateTool.create(spec, {
  name: 'Get Template',
  key: 'get_template',
  description: `Retrieve detailed information about a specific PDF template by its ID. Returns the template's name, type, team, creation date, metadata, and the full list of dynamic variables with their expected data types. Use this to inspect a template's structure before generating a PDF.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      templateId: z.string().describe('Unique identifier of the template to retrieve')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('Unique identifier of the template'),
      name: z.string().describe('Human-readable name of the template'),
      type: z.string().describe('Template type: "editor" or "html"'),
      teamName: z.string().optional().describe('Name of the team the template belongs to'),
      teamId: z.string().optional().describe('Identifier of the team the template belongs to'),
      createdAt: z.string().describe('ISO 8601 timestamp of when the template was created'),
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
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let templateId = requireNonEmptyString(ctx.input.templateId, 'templateId');

    let template = await client.getTemplate(templateId);

    return {
      output: {
        templateId: template.id,
        name: template.name,
        type: template.type,
        teamName: template.team_name,
        teamId: template.team_id,
        createdAt: template.created_at,
        meta: (template.meta ?? {}) as Record<string, unknown>,
        variables: (template.variables ?? []).map(v => ({
          name: v.name,
          type: v.type
        }))
      },
      message: `Retrieved template **${template.name}** (${template.type}) with **${(template.variables ?? []).length}** variable(s).`
    };
  })
  .build();
