import { SlateTool } from 'slates';
import { z } from 'zod';
import { NanonetsClient } from '../lib/client';
import { spec } from '../spec';

export let assignFiles = SlateTool.create(spec, {
  name: 'Assign Files',
  key: 'assign_files',
  description:
    'Assign one or more processed Nanonets files to a team member for review or approval.',
  instructions: [
    'Use request file IDs returned by extraction or prediction result tools.',
    'The member email must belong to a user on the Nanonets team with access to the model.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      modelId: z.string().describe('ID of the model the files belong to'),
      fileIds: z.array(z.string()).min(1).describe('Request file IDs to assign'),
      memberEmail: z.string().email().describe('Email address of the Nanonets team member')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the assignment request was accepted'),
      modelId: z.string().describe('ID of the model the files belong to'),
      fileIds: z.array(z.string()).describe('Request file IDs that were assigned'),
      memberEmail: z.string().describe('Email address assigned to the files'),
      rawResponse: z.any().optional().describe('Raw Nanonets response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NanonetsClient(ctx.auth.token);

    let result = await client.assignFiles(
      ctx.input.modelId,
      ctx.input.fileIds,
      ctx.input.memberEmail
    );

    return {
      output: {
        success: true,
        modelId: ctx.input.modelId,
        fileIds: ctx.input.fileIds,
        memberEmail: ctx.input.memberEmail,
        rawResponse: result
      },
      message: `Assigned **${ctx.input.fileIds.length}** file(s) to ${ctx.input.memberEmail}.`
    };
  })
  .build();
