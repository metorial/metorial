import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const listJobPositions = SlateTool.create(spec, {
  key: 'list_job_positions',
  name: 'List Job Positions',
  description:
    'List TalentHR job positions, including position IDs and titles, published state, and application pipeline details returned by TalentHR. Use the IDs to filter list_job_applications.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(
    z.object({
      positions: z
        .array(z.object({ id: z.number(), job_position_title: z.string() }).passthrough())
        .describe('Job positions with provider fields preserved'),
      count: z.number().describe('Number of job positions returned'),
      rawResponse: z.any().optional().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    const response = await new Client({ token: ctx.auth.token }).listJobPositions();
    return {
      output: { positions: response.data, count: response.data.length, rawResponse: response },
      message: `Retrieved ${response.data.length} job position(s).`
    };
  })
  .build();
