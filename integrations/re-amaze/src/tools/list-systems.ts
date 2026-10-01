import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { numericIdAlias, toProviderId } from '../lib/response';
import { spec } from '../spec';

export let listSystems = SlateTool.create(spec, {
  name: 'List Systems',
  key: 'list_systems',
  description: `Retrieve all systems configured on the status page. Useful for finding system IDs needed when creating or updating incidents.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      systems: z
        .array(
          z.object({
            systemId: z
              .number()
              .optional()
              .describe('Legacy numeric system ID when available'),
            systemIdentifier: z.string().describe('Canonical system ID'),
            title: z.string().describe('System title'),
            status: z.string().optional().describe('Current system status'),
            createdAt: z.string().optional().describe('ISO 8601 creation timestamp'),
            updatedAt: z.string().optional().describe('ISO 8601 last update timestamp')
          })
        )
        .describe('List of monitored systems')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      loginEmail: ctx.auth.loginEmail,
      brandSubdomain: ctx.config.brandSubdomain
    });

    let result = await client.listSystems();
    let systems = (Array.isArray(result) ? result : result.systems || []).map((s: any) => ({
      systemId: numericIdAlias(s.id, 'System ID'),
      systemIdentifier: toProviderId(s.id, 'System ID'),
      title: s.title,
      status: s.status,
      createdAt: s.created_at,
      updatedAt: s.updated_at
    }));

    return {
      output: { systems },
      message: `Found **${systems.length}** systems.`
    };
  })
  .build();
