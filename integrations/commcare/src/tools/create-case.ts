import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createCase = SlateTool.create(spec, {
  name: 'Create Case',
  key: 'create_case',
  description: `Create a new case in CommCare. Cases are the core data records used for longitudinal tracking (e.g., patients, households, facilities).
Specify the case type, name, owner, and any custom properties. Optionally set relationships to other cases via indices.`,
  constraints: [
    'Requires the Case API v2 (v0.6) endpoint. Your project must have API access enabled.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      caseType: z
        .string()
        .describe('The type of case to create (e.g., "patient", "household")'),
      caseName: z.string().optional().describe('Human-readable name for the case'),
      ownerId: z.string().optional().describe('User or group ID that owns this case'),
      externalId: z
        .string()
        .optional()
        .describe('External system identifier for upsert operations'),
      properties: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom case properties as key-value pairs'),
      indices: z
        .record(
          z.string(),
          z.object({
            caseType: z.string().describe('Case type of the related case'),
            caseId: z.string().describe('Case ID of the related case'),
            relationship: z
              .string()
              .optional()
              .describe('Relationship type, e.g., "child" or "extension"')
          })
        )
        .optional()
        .describe('Relationships to other cases')
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
      | Record<string, { case_type: string; case_id: string; relationship?: string }>
      | undefined;
    if (ctx.input.indices) {
      indices = {};
      for (let [key, val] of Object.entries(ctx.input.indices)) {
        indices[key] = {
          case_type: val.caseType,
          case_id: val.caseId,
          relationship: val.relationship
        };
      }
    }

    let result = await client.createCase({
      case_type: ctx.input.caseType,
      case_name: ctx.input.caseName,
      owner_id: ctx.input.ownerId,
      external_id: ctx.input.externalId,
      properties: ctx.input.properties,
      indices
    });

    let caseId = result?.case_id || result?.id || '';

    return {
      output: {
        caseId,
        success: true
      },
      message: `Created case of type **${ctx.input.caseType}**${ctx.input.caseName ? ` named "${ctx.input.caseName}"` : ''}.`
    };
  })
  .build();
