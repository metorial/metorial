import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deletePagespeedTest = SlateTool.create(spec, {
  name: 'Delete Page Speed Test',
  key: 'delete_pagespeed_test',
  description: `Permanently delete a page speed monitoring check. This action cannot be undone.`,
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      testId: z.string().describe('ID of the page speed test to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deletePagespeedTest(ctx.input.testId);

    return {
      output: { success: true },
      message: `Deleted page speed test **${ctx.input.testId}**.`
    };
  })
  .build();
