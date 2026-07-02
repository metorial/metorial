import { SlateTool } from 'slates';
import { z } from 'zod';
import { CodemagicClient } from '../lib/client';
import { spec } from '../spec';

export let createArtifactUrl = SlateTool.create(spec, {
  name: 'Create Artifact URL',
  key: 'create_artifact_url',
  description: `Generate a public download URL for a build artifact. The URL can be shared and has a configurable expiration time. Use the artifact URL from a build's artifacts list.`,
  instructions: [
    'The artifactUrl should be the authenticated URL from the build artifacts list (e.g. from the Get Build tool).',
    'Public URLs are accessible to anyone - be careful when sharing.'
  ],
  constraints: ['Public download URLs are accessible to anyone with the link.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      artifactUrl: z
        .string()
        .describe('The authenticated artifact download URL from the build response'),
      expiresAt: z
        .number()
        .optional()
        .describe('Expiration time as a UNIX timestamp in seconds')
    })
  )
  .output(
    z.object({
      publicUrl: z.string().describe('Public download URL for the artifact'),
      expiresAt: z.string().describe('Expiration time of the public URL')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CodemagicClient({ token: ctx.auth.token });
    let result = await client.getPublicArtifactUrl(ctx.input.artifactUrl, ctx.input.expiresAt);

    return {
      output: {
        publicUrl: result.url,
        expiresAt: result.expiresAt
      },
      message: `Created public artifact URL expiring at **${result.expiresAt}**.`
    };
  })
  .build();
