import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listRegions = SlateTool.create(spec, {
  name: 'List Regions',
  key: 'list_regions',
  description: `List all available DigitalOcean regions. Returns region slugs, names, and available features. Use region slugs when creating Droplets, databases, and other resources.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      regions: z.array(
        z.object({
          slug: z.string().describe('Region slug (use this in API calls)'),
          name: z.string().describe('Region display name'),
          available: z.boolean().describe('Whether the region is available'),
          features: z.array(z.string()).describe('Available features in this region'),
          sizes: z.array(z.string()).describe('Available Droplet sizes in this region')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let regions = await client.listRegions();

    return {
      output: {
        regions: regions.map((r: any) => ({
          slug: r.slug,
          name: r.name,
          available: r.available,
          features: r.features || [],
          sizes: r.sizes || []
        }))
      },
      message: `Found **${regions.length}** available region(s).`
    };
  })
  .build();

export let listSizes = SlateTool.create(spec, {
  name: 'List Sizes',
  key: 'list_sizes',
  description: `List all available Droplet sizes. Returns size slugs, pricing, CPU, memory, and disk specifications. Use size slugs when creating Droplets.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      sizes: z.array(
        z.object({
          slug: z.string().describe('Size slug (use this in API calls)'),
          available: z.boolean().describe('Whether this size is available'),
          priceMonthly: z.number().describe('Monthly price in USD'),
          priceHourly: z.number().describe('Hourly price in USD'),
          vcpus: z.number().describe('Number of virtual CPUs'),
          memory: z.number().describe('Memory in megabytes'),
          disk: z.number().describe('Disk size in gigabytes'),
          transfer: z.number().describe('Transfer bandwidth in terabytes'),
          regions: z.array(z.string()).describe('Available region slugs'),
          description: z.string().describe('Size description')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let sizes = await client.listSizes();

    return {
      output: {
        sizes: sizes.map((s: any) => ({
          slug: s.slug,
          available: s.available,
          priceMonthly: s.price_monthly,
          priceHourly: s.price_hourly,
          vcpus: s.vcpus,
          memory: s.memory,
          disk: s.disk,
          transfer: s.transfer,
          regions: s.regions || [],
          description: s.description || ''
        }))
      },
      message: `Found **${sizes.length}** available Droplet size(s).`
    };
  })
  .build();

export let listSnapshots = SlateTool.create(spec, {
  name: 'List Snapshots',
  key: 'list_snapshots',
  description: `List snapshots of Droplets and volumes. Use these snapshots to create new Droplets or volumes from a previous state.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      resourceType: z
        .enum(['droplet', 'volume'])
        .optional()
        .describe('Filter by resource type'),
      page: z.number().optional().describe('Page number'),
      perPage: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      snapshots: z.array(
        z.object({
          snapshotId: z.string().describe('Snapshot ID'),
          name: z.string().describe('Snapshot name'),
          resourceType: z.string().describe('Resource type (droplet or volume)'),
          resourceId: z.string().describe('Source resource ID'),
          regions: z.array(z.string()).describe('Available regions'),
          minDiskSize: z.number().describe('Minimum disk size in GB'),
          sizeGigabytes: z.number().describe('Snapshot size in GB'),
          createdAt: z.string().describe('Creation timestamp')
        })
      ),
      totalCount: z.number().describe('Total snapshot count')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listSnapshots({
      resourceType: ctx.input.resourceType,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let snapshots = result.snapshots.map((s: any) => ({
      snapshotId: String(s.id),
      name: s.name,
      resourceType: s.resource_type,
      resourceId: String(s.resource_id),
      regions: s.regions || [],
      minDiskSize: s.min_disk_size,
      sizeGigabytes: s.size_gigabytes,
      createdAt: s.created_at
    }));

    return {
      output: { snapshots, totalCount: result.meta?.total || snapshots.length },
      message: `Found **${snapshots.length}** snapshot(s)${ctx.input.resourceType ? ` of type ${ctx.input.resourceType}` : ''}.`
    };
  })
  .build();

export let listImages = SlateTool.create(spec, {
  name: 'List Images',
  key: 'list_images',
  description: `List available images including distributions, applications, and custom images. Use image slugs or IDs when creating Droplets.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      imageType: z
        .enum(['distribution', 'application'])
        .optional()
        .describe('Filter by image type'),
      privateOnly: z.boolean().optional().describe('Only show private/custom images'),
      tagName: z.string().optional().describe('Filter by tag name'),
      page: z.number().optional().describe('Page number'),
      perPage: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      images: z.array(
        z.object({
          imageId: z.number().describe('Image ID'),
          name: z.string().describe('Image name'),
          slug: z.string().optional().describe('Image slug (use this in API calls)'),
          distribution: z.string().describe('OS distribution'),
          imageType: z.string().describe('Image type'),
          public: z.boolean().describe('Whether the image is public'),
          regions: z.array(z.string()).describe('Available regions'),
          minDiskSize: z.number().describe('Minimum disk size in GB'),
          sizeGigabytes: z.number().optional().describe('Image size in GB'),
          createdAt: z.string().describe('Creation timestamp')
        })
      ),
      totalCount: z.number().describe('Total image count')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listImages({
      type: ctx.input.imageType,
      private_: ctx.input.privateOnly,
      tagName: ctx.input.tagName,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let images = result.images.map((i: any) => ({
      imageId: i.id,
      name: i.name,
      slug: i.slug || undefined,
      distribution: i.distribution,
      imageType: i.type,
      public: i.public,
      regions: i.regions || [],
      minDiskSize: i.min_disk_size,
      sizeGigabytes: i.size_gigabytes,
      createdAt: i.created_at
    }));

    return {
      output: { images, totalCount: result.meta?.total || images.length },
      message: `Found **${images.length}** image(s).`
    };
  })
  .build();
