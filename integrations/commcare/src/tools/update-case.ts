import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateCase = SlateTool.create(spec, {
  name: 'Update Case',
  key: 'update_case',
  description: `Update an existing case in CommCare. Modify case properties, change ownership, update relationships (indices), or close the case.
Can also be used to reopen a closed case by setting close to false.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      caseId: z.string().describe('The unique case ID to update'),
      caseName: z.string().optional().describe('Updated name for the case'),
      ownerId: z.string().optional().describe('New owner ID for the case'),
      close: z.boolean().optional().describe('Set to true to close the case, false to reopen'),
      properties: z
        .record(z.string(), z.any())
        .optional()
        .describe('Case properties to update as key-value pairs'),
      indices: z
        .record(
          z.string(),
          z
            .object({
              caseType: z.string().describe('Case type of the related case'),
              caseId: z.string().describe('Case ID of the related case'),
              relationship: z
                .string()
                .optional()
                .describe('Relationship type, e.g., "child" or "extension"')
            })
            .nullable()
        )
        .optional()
        .describe('Update case relationships. Set a value to null to remove that index.')
    })
  )
  .output(
    z.object({
      caseId: z.string(),
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      domain: ctx.config.domain,
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let indices:
      | Record<string, { case_type: string; case_id: string; relationship?: string } | null>
      | undefined;
    if (ctx.input.indices) {
      indices = {};
      for (let [key, val] of Object.entries(ctx.input.indices)) {
        if (val === null) {
          indices[key] = null;
        } else {
          indices[key] = {
            case_type: val.caseType,
            case_id: val.caseId,
            relationship: val.relationship
          };
        }
      }
    }

    await client.updateCase(ctx.input.caseId, {
      case_name: ctx.input.caseName,
      owner_id: ctx.input.ownerId,
      close: ctx.input.close,
      properties: ctx.input.properties,
      indices
    });

    return {
      output: {
        caseId: ctx.input.caseId,
        success: true
      },
      message: `Updated case **${ctx.input.caseId}**${ctx.input.close ? ' (closed)' : ''}.`
    };
  })
  .build();
