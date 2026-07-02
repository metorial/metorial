import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCase = SlateTool.create(spec, {
  name: 'Get Case',
  key: 'get_case',
  description: `Retrieve a single case by its ID. Returns the full case record including all properties, indices (relationships to other cases), form submissions, and metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      caseId: z.string().describe('The unique case ID to retrieve')
    })
  )
  .output(
    z.object({
      caseId: z.string(),
      caseType: z.string(),
      caseName: z.string().optional(),
      closed: z.boolean(),
      ownerId: z.string(),
      dateOpened: z.string(),
      dateModified: z.string(),
      dateClosed: z.string().nullable(),
      serverDateModified: z.string(),
      serverDateOpened: z.string(),
      properties: z.record(z.string(), z.any()),
      indices: z.record(z.string(), z.any()),
      userId: z.string(),
      xformIds: z.array(z.string()),
      domain: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      domain: ctx.config.domain,
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let c = await client.getCase(ctx.input.caseId);

    return {
      output: {
        caseId: c.case_id,
        caseType: c.case_type,
        caseName: c.properties?.case_name,
        closed: c.closed,
        ownerId: c.owner_id,
        dateOpened: c.date_opened,
        dateModified: c.date_modified,
        dateClosed: c.date_closed,
        serverDateModified: c.server_date_modified,
        serverDateOpened: c.server_date_opened,
        properties: c.properties,
        indices: c.indices,
        userId: c.user_id,
        xformIds: c.xform_ids,
        domain: c.domain
      },
      message: `Retrieved case **${c.properties?.case_name || c.case_id}** (type: ${c.case_type}, status: ${c.closed ? 'closed' : 'open'}).`
    };
  })
  .build();
