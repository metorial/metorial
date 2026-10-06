import { SlateTool } from 'slates';
import { z } from 'zod';
import { E2BClient } from '../lib/client';
import { spec } from '../spec';

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `List all sandbox templates available to the authenticated team. Templates define the base environment (CPU, memory, disk, pre-installed dependencies) for creating sandboxes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum templates per page (1-100).'),
      nextToken: z
        .string()
        .optional()
        .describe('Cursor from a previous response to fetch the next page.')
    })
  )
  .output(
    z.object({
      templates: z
        .array(
          z.object({
            templateId: z.string().describe('Unique identifier of the template.'),
            buildId: z.string().describe('Latest build ID for the template.'),
            cpuCount: z
              .number()
              .describe('Number of vCPUs allocated to sandboxes created from this template.'),
            memoryMb: z.number().describe('Memory in megabytes allocated to sandboxes.'),
            diskSizeMb: z.number().optional().describe('Disk size in megabytes.'),
            public: z.boolean().describe('Whether the template is publicly available.'),
            aliases: z.array(z.string()).describe('Human-readable aliases for the template.'),
            names: z
              .array(z.string())
              .optional()
              .describe('Names of the template including the team namespace.'),
            createdAt: z
              .string()
              .optional()
              .describe('ISO 8601 timestamp when the template was created.'),
            updatedAt: z
              .string()
              .optional()
              .describe('ISO 8601 timestamp when the template was last updated.'),
            buildStatus: z
              .string()
              .optional()
              .describe('Current build status (e.g., ready, building, error).')
          })
        )
        .describe('List of available templates.'),
      nextToken: z
        .string()
        .optional()
        .describe('Cursor to fetch the next page when more templates exist.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new E2BClient({ token: ctx.auth.token });

    ctx.progress('Fetching templates...');
    let result = await client.listTemplates(ctx.input);

    return {
      output: result,
      message: `Found **${result.templates.length}** template(s).`
    };
  })
  .build();
