import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { digitalOceanValidationError } from '../lib/errors';
import { spec } from '../spec';

let dropletSchema = z.object({
  dropletId: z.number().describe('Unique identifier for the Droplet'),
  name: z.string().describe('Human-readable name for the Droplet'),
  status: z.string().describe('Current status (new, active, off, archive)'),
  region: z.string().describe('Region slug where the Droplet is located'),
  size: z.string().describe('Size slug of the Droplet'),
  image: z.string().describe('Image name used to create the Droplet'),
  vcpus: z.number().describe('Number of virtual CPUs'),
  memory: z.number().describe('Memory in megabytes'),
  disk: z.number().describe('Disk size in gigabytes'),
  publicIpv4: z.string().optional().describe('Public IPv4 address'),
  privateIpv4: z.string().optional().describe('Private IPv4 address'),
  tags: z.array(z.string()).describe('Tags associated with the Droplet'),
  createdAt: z.string().describe('Creation timestamp')
});

export let listDroplets = SlateTool.create(spec, {
  name: 'List Droplets',
  key: 'list_droplets',
  description: `List Droplets (virtual machines) in your DigitalOcean account. Optionally filter by tag name, exact name, or Droplet type. Returns key details including status, IP addresses, region, and resource allocation.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tagName: z.string().optional().describe('Filter Droplets by this tag name'),
      name: z.string().optional().describe('Filter by exact Droplet name (case-insensitive)'),
      type: z
        .enum(['droplets', 'gpus'])
        .optional()
        .describe('Filter standard Droplets or GPU Droplets'),
      page: z.number().optional().describe('Page number for pagination (default: 1)'),
      perPage: z
        .number()
        .optional()
        .describe('Number of results per page (default: 20, max: 200)')
    })
  )
  .output(
    z.object({
      droplets: z.array(dropletSchema),
      totalCount: z.number().describe('Total number of Droplets matching the query')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.tagName && (ctx.input.name || ctx.input.type)) {
      throw digitalOceanValidationError(
        'tagName cannot be combined with name or type filters'
      );
    }

    let result = await client.listDroplets({
      tagName: ctx.input.tagName,
      name: ctx.input.name,
      type: ctx.input.type,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let droplets = result.droplets.map((d: any) => {
      let publicNet = d.networks?.v4?.find((n: any) => n.type === 'public');
      let privateNet = d.networks?.v4?.find((n: any) => n.type === 'private');

      return {
        dropletId: d.id,
        name: d.name,
        status: d.status,
        region: d.region?.slug || '',
        size: d.size_slug || d.size?.slug || '',
        image: d.image?.name || d.image?.slug || '',
        vcpus: d.vcpus,
        memory: d.memory,
        disk: d.disk,
        publicIpv4: publicNet?.ip_address,
        privateIpv4: privateNet?.ip_address,
        tags: d.tags || [],
        createdAt: d.created_at
      };
    });

    let totalCount = result.meta?.total || droplets.length;

    return {
      output: { droplets, totalCount },
      message: `Found **${totalCount}** Droplet(s). Showing page ${ctx.input.page || 1}.`
    };
  })
  .build();
