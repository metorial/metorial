import { SlateTool } from 'slates';
import { z } from 'zod';
import { getArtifactDownloadUrl } from '../lib/client';
import { spec } from '../spec';

export let downloadArtifact = SlateTool.create(spec, {
  name: 'Download Artifact',
  key: 'download_artifact',
  description:
    'Prepare a build artifact for download using its authenticated artifact URL from get_build.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      artifactUrl: z
        .string()
        .describe('Authenticated artifact URL from the artefacts list returned by get_build')
    })
  )
  .output(
    z.object({
      fileName: z.string().describe('Artifact file name')
    })
  )
  .handleInvocation(async ctx => {
    let url = getArtifactDownloadUrl(ctx.input.artifactUrl);
    let fileName = url.pathname.split('/').at(-1) || 'artifact';
    await ctx.addAttachment({
      type: 'url',
      url,
      headers: { 'x-auth-token': ctx.auth.token }
    });
    return {
      output: { fileName },
      message: `Prepared **${fileName}** for download.`
    };
  })
  .build();
