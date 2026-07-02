import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listPasses = SlateTool.create(spec, {
  name: 'List Passes',
  key: 'list_passes',
  description: `List all generated wallet passes. Optionally filter by pass type identifier to see only passes of a specific type.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      passTypeIdentifier: z
        .string()
        .optional()
        .describe('Filter passes by pass type identifier (e.g., "pass.example.id1")')
    })
  )
  .output(
    z.object({
      passes: z
        .array(
          z.object({
            serialNumber: z.string().describe('Unique serial number of the pass'),
            passType: z.string().describe('Pass type identifier')
          })
        )
        .describe('List of passes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let passes: any;
    if (ctx.input.passTypeIdentifier) {
      passes = await client.listPassesByType(ctx.input.passTypeIdentifier);
    } else {
      passes = await client.listPasses();
    }

    let mapped = passes.map((p: any) => ({
      serialNumber: p.serialNumber,
      passType: p.passType
    }));

    return {
      output: { passes: mapped },
      message: `Found **${mapped.length}** pass(es).`
    };
  })
  .build();
