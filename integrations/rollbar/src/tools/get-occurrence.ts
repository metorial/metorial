import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, mapOccurrence } from '../lib/client';
import { spec } from '../spec';

export let getOccurrence = SlateTool.create(spec, {
  name: 'Get Occurrence',
  key: 'get_occurrence',
  description: `Retrieve detailed information about a specific occurrence (instance of an error/message), including full stack trace, request data, and server info.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z
        .number()
        .optional()
        .describe('Project ID from manage_project; required with an account token.'),
      occurrenceId: z.string().describe('Unique occurrence ID')
    })
  )
  .output(
    z.object({
      occurrenceId: z.string().describe('Unique occurrence ID'),
      occurrenceUuid: z
        .string()
        .optional()
        .describe('UUID associated with the reported occurrence'),
      itemId: z.number().optional().describe('Parent item ID'),
      timestamp: z.number().optional().describe('Unix timestamp of the occurrence'),
      level: z.string().optional().describe('Severity level'),
      environment: z.string().optional().describe('Environment name'),
      framework: z.string().optional().describe('Framework'),
      platform: z.string().optional().describe('Platform'),
      language: z.string().optional().describe('Programming language'),
      server: z.any().optional().describe('Server information'),
      request: z.any().optional().describe('HTTP request details'),
      person: z.any().optional().describe('Person/user associated with the occurrence'),
      body: z.any().optional().describe('Occurrence body with error/message details'),
      custom: z.any().optional().describe('Custom data attached to the occurrence'),
      codeVersion: z.string().optional().describe('Code version/revision')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.getOccurrence(ctx.input.occurrenceId);
    let occ = result?.result;

    return {
      output: mapOccurrence(occ),
      message: `Retrieved occurrence **${occ.id}** (${occ.data?.level_string || 'unknown level'}) from environment "${occ.data?.environment || 'unknown'}".`
    };
  })
  .build();
