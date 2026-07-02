import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listIncidents = SlateTool.create(spec, {
  name: 'List Incidents',
  key: 'list_incidents',
  description: `List Datadog incidents. Returns incident details including title, severity, state, and customer impact status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pageSize: z.number().optional().describe('Number of incidents per page (max 100)'),
      pageOffset: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      incidents: z
        .array(
          z.object({
            incidentId: z.string(),
            title: z.string().optional(),
            severity: z.string().optional(),
            state: z.string().optional(),
            customerImpacted: z.boolean().optional(),
            created: z.string().optional(),
            modified: z.string().optional(),
            resolved: z.string().optional()
          })
        )
        .describe('List of incidents')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let result = await client.listIncidents(ctx.input);

    let incidents = (result.data || []).map((inc: any) => ({
      incidentId: inc.id,
      title: inc.attributes?.title,
      severity: inc.attributes?.severity,
      state: inc.attributes?.state,
      customerImpacted: inc.attributes?.customer_impacted,
      created: inc.attributes?.created,
      modified: inc.attributes?.modified,
      resolved: inc.attributes?.resolved
    }));

    return {
      output: { incidents },
      message: `Found **${incidents.length}** incidents`
    };
  })
  .build();
