import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapPerson, personSchema } from '../lib/profiles';
import { spec } from '../spec';

let reverseEmailRecordSchema = z.object({
  email: z.string().optional().describe('The input email address'),
  custom: z.record(z.string(), z.string()).optional().describe('Custom tracking fields'),
  profile: personSchema.optional().describe('Person profile found for this email')
});

export let getReverseEmailResult = SlateTool.create(spec, {
  name: 'Get Reverse Email Result',
  key: 'get_reverse_email_result',
  description: `Retrieve results of a previously started reverse email lookup. Returns person profiles (name, job title, location, work history, skills) and company details for each email looked up.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      enrichmentId: z
        .string()
        .describe('The enrichment ID returned from the reverse email lookup request')
    })
  )
  .output(
    z.object({
      enrichmentId: z.string().describe('Lookup batch ID'),
      name: z.string().optional().describe('Batch name'),
      status: z
        .enum([
          'CREATED',
          'IN_PROGRESS',
          'CANCELED',
          'CREDITS_INSUFFICIENT',
          'FINISHED',
          'RATE_LIMIT',
          'UNKNOWN'
        ])
        .describe('Current lookup status'),
      records: z.array(reverseEmailRecordSchema).describe('Lookup results per email'),
      creditsUsed: z.number().optional().describe('Credits consumed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getReverseEmailResult(ctx.input.enrichmentId);

    let records = (result.data ?? []).map(entry => ({
      email: entry.input?.email,
      custom: entry.custom,
      profile: entry.profile ? mapPerson(entry.profile) : undefined
    }));

    let output = {
      enrichmentId: result.id,
      name: result.name,
      status: result.status,
      records,
      creditsUsed: result.cost?.credits
    };

    let found = records.filter(record => record.profile).length;

    return {
      output,
      message: `Reverse email lookup **"${result.name}"** — Status: **${result.status}**. ${records.length} email(s) processed, ${found} person profile(s) found. Credits used: ${result.cost?.credits ?? 0}.`
    };
  })
  .build();
