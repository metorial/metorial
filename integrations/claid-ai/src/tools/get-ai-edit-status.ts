import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { addResultFiles, jobOutputSchema, mapJob } from '../lib/responses';
import { spec } from '../spec';

export let getAiEditStatus = SlateTool.create(spec, {
  name: 'Get AI Edit Status',
  key: 'get_ai_edit_status',
  description:
    'Check a natural-language image editing job and retrieve its downloadable results when complete.',
  instructions: [
    'Use the taskId returned by ai_edit_image. Temporary results are available for 24 hours.'
  ],
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({ taskId: z.number().describe('Task ID returned by ai_edit_image') }))
  .output(jobOutputSchema)
  .handleInvocation(async ctx => {
    let { data } = await new Client({ token: ctx.auth.token }).getAiEditStatus(
      ctx.input.taskId
    );
    if (data.result) {
      await addResultFiles(
        ctx,
        data.result.output_objects ??
          (data.result.output_object ? [data.result.output_object] : [])
      );
    }
    return {
      output: mapJob(data),
      message: `AI edit job **${data.id}** status: **${data.status}**.`
    };
  })
  .build();
