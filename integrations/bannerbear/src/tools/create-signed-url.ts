import { SlateTool } from 'slates';
import { z } from 'zod';
import { BannerbearClient } from '../lib/client';
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
      templateUid: z.string().describe('UID of the template to create a signed base for')
    })
  )
  .output(
    z.object({
      baseUrl: z.string().describe('The signed base URL for generating images on-demand'),
      exampleUrl: z
        .string()
        .nullable()
        .describe('Example URL showing how to append parameters'),
      templateUid: z.string().describe('UID of the template')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BannerbearClient({ token: ctx.auth.token });

    let result = await client.createSignedBase(ctx.input.templateUid);

    return {
      output: {
        baseUrl: result.base_url,
        exampleUrl: result.example_url || null,
        templateUid: ctx.input.templateUid
      },
      message: `Signed base URL created for template ${ctx.input.templateUid}. Base URL: \`${result.base_url}\``
    };
  })
  .build();
