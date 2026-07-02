import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateResponse = SlateTool.create(spec, {
  name: 'Update Response',
  key: 'update_response',
  description: `Update an existing survey response. Add or modify answer data, or mark the response as finished. Triggers the response processing pipeline.`
})
  .input(
    z.object({
      responseId: z.string().describe('ID of the response to update'),
      answers: z
        .record(z.string(), z.any())
        .optional()
        .describe('Updated response answers keyed by question ID'),
      finished: z.boolean().optional().describe('Set to true to mark the response as complete')
    })
  )
  .output(
    z.object({
      responseId: z.string().describe('ID of the updated response'),
      finished: z.boolean().describe('Whether the response is complete'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let updateData: Record<string, any> = {};
    if (ctx.input.answers !== undefined) updateData.data = ctx.input.answers;
    if (ctx.input.finished !== undefined) updateData.finished = ctx.input.finished;

    let response = await client.updateResponse(ctx.input.responseId, updateData);

    return {
      output: {
        responseId: response.id,
        finished: response.finished ?? false,
        updatedAt: response.updatedAt ?? ''
      },
      message: `Updated response \`${response.id}\` (finished: ${response.finished ?? false}).`
    };
  })
  .build();
