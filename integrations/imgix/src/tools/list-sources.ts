import { SlateTool } from 'slates';
import { z } from 'zod';
import { ImgixClient } from '../lib/client';
import { spec } from '../spec';

let sourceSchema = z.object({
  sourceId: z.string().describe('Unique identifier of the source'),
  name: z.string().describe('Display name of the source'),
  enabled: z.boolean().describe('Whether the source is currently enabled'),
  deploymentStatus: z
    .string()
    .describe('Current deployment status (deploying, deployed, disabled, deleted)'),
  deploymentType: z
    .string()
    .optional()
    .describe('Type of storage backend (s3, gcs, azure, webfolder, webproxy, s3_compatible)'),
  imgixSubdomains: z
    .array(z.string())
    .optional()
    .describe('Imgix subdomains assigned to this source'),
  customDomains: z
    .array(z.string())
    .optional()
    .describe('Custom domains assigned to this source'),
  dateDeployed: z.number().optional().describe('Unix timestamp of last deployment')
});

export let listSources = SlateTool.create(spec, {
  name: 'List Sources',
  key: 'list_sources',
  description: `List all Imgix sources in your account. Sources define the origin storage backends (S3, GCS, Azure, Web Folder, Web Proxy, or S3-compatible) from which Imgix fetches and serves images. Use filtering to narrow results by name, enabled status, or deployment type.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sort: z
        .enum(['name', '-name', 'date_deployed', '-date_deployed', 'enabled', '-enabled'])
        .optional()
        .describe('Sort field and direction. Prefix with - for descending.'),
      filterName: z.string().optional().describe('Filter sources by name'),
      filterEnabled: z.boolean().optional().describe('Filter by enabled/disabled status'),
      filterDeploymentType: z
        .enum(['s3', 'gcs', 'azure', 'webfolder', 'webproxy', 's3_compatible'])
        .optional()
        .describe('Filter by storage backend type'),
      pageNumber: z.number().optional().describe('Page number for pagination'),
      pageSize: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      sources: z.array(sourceSchema).describe('List of sources')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ImgixClient(ctx.auth.token);

    let result = await client.listSources({
      sort: ctx.input.sort,
      filterName: ctx.input.filterName,
      filterEnabled: ctx.input.filterEnabled,
      filterDeploymentType: ctx.input.filterDeploymentType,
      pageNumber: ctx.input.pageNumber,
      pageSize: ctx.input.pageSize
    });

    let sources = (result.data || []).map((s: any) => ({
      sourceId: s.id,
      name: s.attributes?.name ?? '',
      enabled: s.attributes?.enabled ?? false,
      deploymentStatus: s.attributes?.deployment_status ?? 'unknown',
      deploymentType: s.attributes?.deployment?.type,
      imgixSubdomains: s.attributes?.deployment?.imgix_subdomains,
      customDomains: s.attributes?.deployment?.custom_domains,
      dateDeployed: s.attributes?.date_deployed
    }));

    return {
      output: { sources },
      message: `Found **${sources.length}** source(s).`
    };
  })
  .build();
