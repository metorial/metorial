import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let caseEntrySchema = z.object({
  caseId: z
    .string()
    .optional()
    .describe('Case ID for updating an existing case. Omit to create a new case.'),
  caseType: z.string().optional().describe('Case type (required for new cases)'),
  caseName: z.string().optional().describe('Human-readable name for the case'),
  ownerId: z.string().optional().describe('User or group ID that owns this case'),
  externalId: z
    .string()
    .optional()
    .describe('External system identifier for upsert operations'),
  close: z.boolean().optional().describe('Set to true to close the case'),
  properties: z
    .record(z.string(), z.any())
    .optional()
    .describe('Custom case properties as key-value pairs'),
  indices: z
    .record(
      z.string(),
      z
        .object({
          caseType: z.string(),
          caseId: z.string(),
          relationship: z.string().optional()
        })
        .nullable()
    )
    .optional()
    .describe('Relationships to other cases. Set to null to remove an index.')
});

export let bulkCases = SlateTool.create(spec, {
  name: 'Bulk Create or Update Cases',
  key: 'bulk_cases',
  description: `Create or update multiple cases in a single request. Each entry can either create a new case (omit caseId) or update an existing case (provide caseId).
Supports up to 100 cases per request. Useful for batch imports, migrations, or synchronized updates.`,
  constraints: [
    'Maximum 100 cases per request.',
    'Uses the Case API v2 (v0.6) bulk endpoint.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      cases: z
        .array(caseEntrySchema)
        .min(1)
        .max(100)
        .describe('Array of case objects to create or update')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      createdCount: z.number(),
      updatedCount: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      domain: ctx.config.domain,
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let payload = ctx.input.cases.map(c => {
      let indices:
        | Record<string, { case_type: string; case_id: string; relationship?: string } | null>
        | undefined;
      if (c.indices) {
        indices = {};
        for (let [key, val] of Object.entries(c.indices)) {
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

      return {
        case_id: c.caseId,
        case_type: c.caseType,
        case_name: c.caseName,
        owner_id: c.ownerId,
        external_id: c.externalId,
        close: c.close,
        properties: c.properties,
        indices
      };
    });

    let createdCount = payload.filter(c => !c.case_id).length;
    let updatedCount = payload.filter(c => !!c.case_id).length;

    await client.bulkCreateOrUpdateCases(payload);

    return {
      output: {
        success: true,
        createdCount,
        updatedCount
      },
      message: `Bulk operation completed: **${createdCount}** cases created, **${updatedCount}** cases updated.`
    };
  })
  .build();
