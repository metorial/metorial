import { SlateTool } from 'slates';
import { z } from 'zod';
import { ImgixClient } from '../lib/client';
import { spec } from '../spec';

export let getSource = SlateTool.create(spec, {
  name: 'Get Source',
  key: 'get_source',
  description: `Retrieve full details of a specific Imgix source by its ID. Returns the source's configuration including deployment settings, cache behavior, security settings, custom domains, and current deployment status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sourceId: z.string().describe('ID of the source to retrieve')
    })
  )
  .output(
    z.object({
      sourceId: z.string().describe('Unique identifier of the source'),
      name: z.string().describe('Display name of the source'),
      enabled: z.boolean().describe('Whether the source is currently enabled'),
      deploymentStatus: z.string().describe('Current deployment status'),
      deployment: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Full deployment configuration including type, subdomains, and storage-specific settings'
        ),
      secureUrlToken: z
        .string()
        .optional()
        .describe('Token used for generating signed/secure URLs'),
      dateDeployed: z.number().optional().describe('Unix timestamp of last deployment')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ImgixClient(ctx.auth.token);
    let result = await client.getSource(ctx.input.sourceId);
    let s = result.data;

    let output = {
      sourceId: s.id,
      name: s.attributes?.name ?? '',
      enabled: s.attributes?.enabled ?? false,
      deploymentStatus: s.attributes?.deployment_status ?? 'unknown',
      deployment: s.attributes?.deployment,
      secureUrlToken: s.attributes?.secure_url_token,
      dateDeployed: s.attributes?.date_deployed
    };

    return {
      output,
      message: `Retrieved source **${output.name}** (${output.deploymentStatus}).`
    };
  })
  .build();
