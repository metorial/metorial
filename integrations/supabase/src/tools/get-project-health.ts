import { SlateTool } from 'slates';
import { z } from 'zod';
import { ManagementClient } from '../lib/client';
import { requireProjectRef } from '../lib/errors';
import { spec } from '../spec';

const serviceSchema = z.enum([
  'auth',
  'db',
  'db_postgres_user',
  'pooler',
  'realtime',
  'rest',
  'storage',
  'pg_bouncer'
]);

export let getProjectHealth = SlateTool.create(spec, {
  name: 'Get Project Health',
  key: 'get_project_health',
  description: `Check health for Supabase project services such as Auth, Postgres, REST, Realtime, Storage, and Pooler.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectRef: z
        .string()
        .optional()
        .describe('Project reference ID (uses config.projectRef if not provided)'),
      services: z
        .array(serviceSchema)
        .optional()
        .describe('Services to check. Defaults to auth, db, rest, and storage.'),
      timeoutMs: z
        .number()
        .optional()
        .describe('Health check timeout in milliseconds, up to 10000')
    })
  )
  .output(
    z.object({
      services: z
        .array(
          z.object({
            name: z.string().describe('Service name'),
            status: z.string().describe('Service health status'),
            healthy: z.boolean().optional().describe('Deprecated Supabase health flag'),
            error: z.string().optional().describe('Service error, when reported')
          })
        )
        .describe('Health results by service'),
      totalCount: z.number().describe('Number of services returned')
    })
  )
  .handleInvocation(async ctx => {
    let projectRef = requireProjectRef(ctx.input.projectRef ?? ctx.config.projectRef);
    let services = ctx.input.services ?? ['auth', 'db', 'rest', 'storage'];
    let client = new ManagementClient(ctx.auth.token);
    let data = await client.getProjectHealth(projectRef, {
      services,
      timeoutMs: ctx.input.timeoutMs
    });

    let results = (Array.isArray(data) ? data : []).map((service: any) => ({
      name: service.name ?? '',
      status: service.status ?? '',
      healthy: service.healthy ?? undefined,
      error: service.error ?? undefined
    }));

    return {
      output: {
        services: results,
        totalCount: results.length
      },
      message: `Checked **${results.length}** Supabase services for project **${projectRef}**.`
    };
  })
  .build();
