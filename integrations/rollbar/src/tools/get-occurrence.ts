import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      occurrenceId: z.string().describe('Unique occurrence ID')
    })
  )
  .output(
    z.object({
      occurrenceId: z.string().describe('Unique occurrence ID'),
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
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getOccurrence(ctx.input.occurrenceId);
    let occ = result?.result;

    return {
      output: {
        occurrenceId: occ.id,
        itemId: occ.item_id,
        timestamp: occ.timestamp,
        level: occ.data?.level_string || occ.data?.level,
        environment: occ.data?.environment,
        framework: occ.data?.framework,
        platform: occ.data?.platform,
        language: occ.data?.language,
        server: occ.data?.server,
        request: occ.data?.request,
        person: occ.data?.person,
        body: occ.data?.body,
        custom: occ.data?.custom,
        codeVersion: occ.data?.code_version
      },
      message: `Retrieved occurrence **${occ.id}** (${occ.data?.level_string || 'unknown level'}) from environment "${occ.data?.environment || 'unknown'}".`
    };
  })
  .build();
