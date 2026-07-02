import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let lookupExternalId = SlateTool.create(spec, {
  name: 'Lookup External ID',
  key: 'lookup_external_id',
  description: `Map an external system ID to a ForceManager internal ID.
Useful for synchronization with external ERPs, CRMs, or accounting systems that assign their own identifiers to records.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      entityType: z
        .string()
        .describe(
          'Entity type to search (e.g. "company", "contact", "opportunity", "product", "salesorder")'
        ),
      externalId: z.string().describe('The external system ID to look up')
    })
  )
  .output(
    z.object({
      internalId: z
        .number()
        .nullable()
        .describe('ForceManager internal ID, or null if not found'),
      entityType: z.string().describe('The entity type that was searched'),
      externalId: z.string().describe('The external ID that was looked up')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    try {
      let result = await client.getInternalId(ctx.input.entityType, ctx.input.externalId);
      let internalId =
        result?.id || result?.internalId || (typeof result === 'number' ? result : null);

      return {
        output: {
          internalId,
          entityType: ctx.input.entityType,
          externalId: ctx.input.externalId
        },
        message: internalId
          ? `External ID **${ctx.input.externalId}** maps to internal ID **${internalId}** (${ctx.input.entityType})`
          : `No internal ID found for external ID **${ctx.input.externalId}** (${ctx.input.entityType})`
      };
    } catch (err: any) {
      if (err?.response?.status === 404) {
        return {
          output: {
            internalId: null,
            entityType: ctx.input.entityType,
            externalId: ctx.input.externalId
          },
          message: `No internal ID found for external ID **${ctx.input.externalId}** (${ctx.input.entityType})`
        };
      }
      throw err;
    }
  })
  .build();
