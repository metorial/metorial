import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateSocialMediaContent = SlateTool.create(spec, {
  name: 'Generate Social Media Content',
  key: 'generate_social_media_content',
  description: `Transform product descriptions into platform-optimized social media posts. Generates engaging posts complete with trending hashtags and viral-ready content tailored for various social media platforms.

Provide a product or service description and receive ready-to-publish social media content.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      productDescription: z
        .string()
        .describe('Description of the product or service to create social media content for')
    })
  )
  .output(
    z.object({
      socialContent: z
        .any()
        .describe('Generated social media posts with hashtags and platform-tailored content')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.progress('Generating social media content...');

    let result = await client.generateSocialMediaContent({
      productDescription: ctx.input.productDescription
    });

    return {
      output: {
        socialContent: result
      },
      message: `Successfully generated social media content for the provided product description.`
    };
  })
  .build();
