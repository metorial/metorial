import { SlateTool } from 'slates';
import { z } from 'zod';
import { BannerbearClient } from '../lib/client';
import { address, nullableText, uid } from '../lib/contracts';
import { projectIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let createSignedUrl = SlateTool.create(spec, {
  name: 'Create Signed URL',
  key: 'create_signed_url',
  description: `Create a Signed Base URL for a Bannerbear template, enabling on-demand image generation via encrypted URL parameters. Once created, you can generate images synchronously by appending encoded modifications to the base URL, without making standard API calls.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      projectId: projectIdSchema,
      templateUid: z.string().describe('UID of the template to create a signed base for')
    })
  )
  .output(
    z.object({
      signedBaseUid: z.string().optional().describe('UID of the created signed base'),
      baseUrl: z.string().describe('The signed base URL for generating images on-demand'),
      exampleUrl: z
        .string()
        .nullable()
        .describe('Example URL showing how to append parameters'),
      templateUid: z.string().describe('UID of the template')
    })
  )
  .handleInvocation(async ctx => {
    const client = new BannerbearClient({ ...ctx.auth, projectId: ctx.input.projectId });
    const result = await client.createSignedBase(ctx.input.templateUid);
    const output = {
      baseUrl: address(result.base_url, true),
      exampleUrl: nullableText(result.example_url),
      templateUid: ctx.input.templateUid,
      signedBaseUid: uid(result.uid)
    };
    if (output.exampleUrl !== null) address(output.exampleUrl, true);
    return {
      output,
      message: `Signed base created for the exact template (UID: ${output.signedBaseUid}). Opening a render URL consumes generation quota.`
    };
  })
  .build();
