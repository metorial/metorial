import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAudit = SlateTool.create(spec, {
  name: 'Get Audit',
  key: 'get_audit',
  description: `Retrieve a single audit by its ID, including full details such as checklist responses, compliance status, and related data. Use $expand to include associated categories and responses.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      auditId: z.string().describe('ID of the audit to retrieve'),
      select: z.string().optional().describe('Comma-separated list of fields to return'),
      expand: z
        .string()
        .optional()
        .describe('Related entities to expand (e.g., "Categories,Responses")')
    })
  )
  .output(
    z.object({
      audit: z.record(z.string(), z.any()).describe('Full audit details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let audit = await client.getAudit(ctx.input.auditId, {
      select: ctx.input.select,
      expand: ctx.input.expand
    });

    return {
      output: {
        audit
      },
      message: `Retrieved audit **${ctx.input.auditId}**.`
    };
  })
  .build();
