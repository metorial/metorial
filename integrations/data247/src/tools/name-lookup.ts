import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let nameResultSchema = z.object({
  phone: z.string().optional().describe('The queried phone number'),
  name: z.string().optional().describe('Name associated with the phone number')
});

let mapResult = (raw: Record<string, string>) => ({
  phone: raw.phone,
  name: raw.name
});

export let nameLookup = SlateTool.create(spec, {
  name: 'Name Lookup (CNAM)',
  key: 'name_lookup',
  description: `Look up the name of the person or business associated with phone numbers (Caller Name / CNAM). Useful for identifying callers and enriching phone records with owner names.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      phones: z
        .array(z.string())
        .min(1)
        .max(100)
        .describe('Phone numbers to look up names for')
    })
  )
  .output(
    z.object({
      results: z.array(nameResultSchema).describe('Name lookup results for each phone number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { phones } = ctx.input;

    let results: Record<string, string>[];

    if (phones.length === 1) {
      let result = await client.nameLookup(phones[0]!);
      results = [result];
    } else {
      results = await client.nameLookupBatch(phones);
    }

    let mapped = results.map(mapResult);

    return {
      output: { results: mapped },
      message: `Looked up names for **${phones.length}** phone number(s).`
    };
  })
  .build();
