import { randomUUID } from 'node:crypto';
import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { spec } from '../spec';

export let createOccurrence = SlateTool.create(spec, {
  name: 'Report Occurrence',
  key: 'create_occurrence',
  description:
    'Report a server-side message occurrence to Rollbar. Requires a project token with post_server_item scope or a separately configured postServerToken. That ingestion token determines the project. Reporting consumes occurrence quota. Acceptance is asynchronous; get_item with the returned UUID checks indexing.',
  tags: { destructive: false }
})
  .input(
    z.object({
      environment: z.string().describe('Environment receiving the occurrence'),
      message: z.string().describe('Message body'),
      level: z
        .enum(['debug', 'info', 'warning', 'error', 'critical'])
        .optional()
        .describe('Severity, default error'),
      fingerprint: z
        .string()
        .optional()
        .describe(
          'Optional grouping fingerprint; reuse only when you intend occurrences to share an item'
        ),
      occurrenceUuid: z
        .string()
        .optional()
        .describe(
          'Optional caller-generated 32-character hexadecimal UUID for readback; otherwise generated automatically'
        ),
      codeVersion: z.string().optional().describe('Code revision, at most 40 characters')
    })
  )
  .output(
    z.object({
      occurrenceUuid: z
        .string()
        .describe('UUID used for asynchronous item lookup; not the numeric occurrence ID'),
      accepted: z.boolean().describe('Whether the report was accepted for processing')
    })
  )
  .handleInvocation(async ctx => {
    const result = await createClient(ctx).createOccurrence({
      environment: ctx.input.environment,
      message: ctx.input.message,
      level: ctx.input.level,
      fingerprint: ctx.input.fingerprint,
      uuid: ctx.input.occurrenceUuid ?? randomUUID().replaceAll('-', ''),
      codeVersion: ctx.input.codeVersion
    });
    return {
      output: { occurrenceUuid: result.result.uuid, accepted: true },
      message: `Occurrence ${result.result.uuid} accepted for asynchronous processing. Use get_item with occurrenceUuid to check indexing.`
    };
  })
  .build();
