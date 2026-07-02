import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getKlip = SlateTool.create(spec, {
  name: 'Get Klip',
  key: 'get_klip',
  description: `Retrieve detailed information about a specific Klip including its schema, share rights, and client instances.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      klipId: z.string().describe('ID of the klip to retrieve'),
      includeDetails: z.boolean().optional().describe('Include share rights and full details'),
      includeSchema: z.boolean().optional().describe('Include the klip schema definition')
    })
  )
  .output(
    z.object({
      klipId: z.string().optional(),
      name: z.string().optional(),
      description: z.string().optional(),
      createdBy: z.string().optional(),
      dateCreated: z.string().optional(),
      lastUpdated: z.string().optional(),
      schema: z.any().optional(),
      shareRights: z.array(z.any()).optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let klip = await client.getKlip(ctx.input.klipId, ctx.input.includeDetails);

    let output: any = {
      klipId: klip?.id,
      name: klip?.name,
      description: klip?.description,
      createdBy: klip?.created_by,
      dateCreated: klip?.date_created,
      lastUpdated: klip?.last_updated,
      shareRights: klip?.share_rights
    };

    if (ctx.input.includeSchema) {
      let schema = await client.getKlipSchema(ctx.input.klipId);
      output.schema = schema;
    }

    return {
      output,
      message: `Retrieved klip **${klip?.name || ctx.input.klipId}**.`
    };
  })
  .build();
