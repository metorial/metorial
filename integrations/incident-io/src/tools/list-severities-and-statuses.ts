import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSeveritiesAndStatuses = SlateTool.create(spec, {
  name: 'List Severities & Statuses',
  key: 'list_severities_and_statuses',
  description: `Retrieve all configured incident severities and statuses. Useful for looking up valid IDs before creating or editing incidents.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      severities: z.array(
        z.object({
          severityId: z.string(),
          name: z.string(),
          description: z.string().optional(),
          rank: z.number().optional()
        })
      ),
      statuses: z.array(
        z.object({
          statusId: z.string(),
          name: z.string(),
          description: z.string().optional(),
          category: z.string().optional(),
          rank: z.number().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let [severitiesResult, statusesResult] = await Promise.all([
      client.listSeverities(),
      client.listIncidentStatuses()
    ]);

    let severities = severitiesResult.severities.map((s: any) => ({
      severityId: s.id,
      name: s.name,
      description: s.description || undefined,
      rank: s.rank ?? undefined
    }));

    let statuses = statusesResult.incident_statuses.map((s: any) => ({
      statusId: s.id,
      name: s.name,
      description: s.description || undefined,
      category: s.category || undefined,
      rank: s.rank ?? undefined
    }));

    return {
      output: { severities, statuses },
      message: `Found **${severities.length}** severities and **${statuses.length}** statuses.`
    };
  })
  .build();
