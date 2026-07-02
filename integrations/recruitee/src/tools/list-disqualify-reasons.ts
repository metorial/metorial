import { SlateTool } from 'slates';
import { z } from 'zod';
import { RecruiteeClient } from '../lib/client';
import { spec } from '../spec';

export let listDisqualifyReasons = SlateTool.create(spec, {
  name: 'List Disqualify Reasons',
  key: 'list_disqualify_reasons',
  description: `Retrieve all configured disqualification reasons. Use these reason IDs when disqualifying candidates through the Manage Pipeline tool.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      reasons: z
        .array(
          z.object({
            reasonId: z.number().describe('Disqualify reason ID'),
            name: z.string().describe('Reason name')
          })
        )
        .describe('All disqualification reasons')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RecruiteeClient({
      token: ctx.auth.token,
      companyId: ctx.config.companyId
    });

    let result = await client.listDisqualifyReasons();
    let reasons = result.disqualify_reasons || [];

    return {
      output: {
        reasons: reasons.map((r: any) => ({
          reasonId: r.id,
          name: r.name
        }))
      },
      message: `Found ${reasons.length} disqualification reasons.`
    };
  })
  .build();
