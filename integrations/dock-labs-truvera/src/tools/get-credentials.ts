import { SlateTool } from 'slates';
import { z } from 'zod';
import { DockClient } from '../lib/client';
import { spec } from '../spec';

export let getCredentials = SlateTool.create(spec, {
  name: 'Get Credentials',
  key: 'get_credentials',
  description: `Retrieve a specific credential by ID or list all credentials. Persisted credentials may require a password to decrypt.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      credentialId: z
        .string()
        .optional()
        .describe('Credential ID to retrieve. Omit to list all credentials'),
      password: z.string().optional().describe('Password to decrypt a persisted credential'),
      offset: z.number().optional().describe('Pagination offset for listing'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of results for listing, from 1 to 100'),
      filter: z
        .string()
        .optional()
        .describe('Search credential metadata by ID, subject, issuer, type, or date'),
      subjectId: z.string().optional().describe('Filter by the exact holder DID')
    })
  )
  .output(
    z.object({
      credential: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Credential metadata, including decrypted credential contents when available'
        ),
      credentials: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of credentials')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DockClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    if (ctx.input.credentialId) {
      let result = await client.getCredential(ctx.input.credentialId, {
        password: ctx.input.password
      });
      return {
        output: { credential: result },
        message: `Retrieved credential **${ctx.input.credentialId}**`
      };
    }

    let results = await client.listCredentials({
      offset: ctx.input.offset,
      limit: ctx.input.limit,
      filter: ctx.input.filter,
      subjectId: ctx.input.subjectId
    });
    return {
      output: { credentials: results },
      message: `Found **${results.length}** credential(s)`
    };
  })
  .build();
