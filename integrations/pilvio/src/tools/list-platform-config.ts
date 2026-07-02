import { SlateTool } from 'slates';
import { z } from 'zod';
import { PilvioClient } from '../lib/client';
import { spec } from '../spec';

let locationSchema = z.object({
  slug: z.string().describe('Location slug (e.g., "tll01")'),
  displayName: z.string().describe('Human-readable location name'),
  countryCode: z.string().optional().describe('ISO country code'),
  isDefault: z.boolean().optional().describe('Whether this is the default location'),
  isPreferred: z.boolean().optional().describe('Whether this is a preferred location')
});

let hostPoolSchema = z.object({
  poolUuid: z.string().describe('Resource pool UUID'),
  name: z.string().describe('Pool name (e.g., "General", "Performance")'),
  description: z.string().optional().describe('Pool description'),
  isDefault: z.boolean().optional().describe('Whether this is the default pool')
});

export let listPlatformConfig = SlateTool.create(spec, {
  name: 'List Platform Configuration',
  key: 'list_platform_config',
  description: `Retrieve available datacenter locations, OS images, app images, bootable media, and resource pools (server classes). Useful for discovering valid options before creating VMs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      resource: z
        .enum(['locations', 'os_images', 'app_images', 'bootable_media', 'host_pools'])
        .describe('Configuration resource to list')
    })
  )
  .output(
    z.object({
      locations: z.array(locationSchema).optional().describe('Available datacenter locations'),
      hostPools: z
        .array(hostPoolSchema)
        .optional()
        .describe('Available resource pools/server classes'),
      osImages: z.any().optional().describe('Available OS images'),
      appImages: z.any().optional().describe('Available app catalog images'),
      bootableMedia: z.any().optional().describe('Available bootable ISO media')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PilvioClient({
      token: ctx.auth.token,
      locationSlug: ctx.config.locationSlug
    });

    let { resource } = ctx.input;

    switch (resource) {
      case 'locations': {
        let locations = await client.listLocations();
        let mapped = (Array.isArray(locations) ? locations : []).map((l: any) => ({
          slug: l.slug,
          displayName: l.display_name,
          countryCode: l.country_code,
          isDefault: l.is_default,
          isPreferred: l.is_preferred
        }));
        return {
          output: { locations: mapped },
          message: `Found **${mapped.length}** datacenter location(s).`
        };
      }

      case 'host_pools': {
        let pools = await client.listHostPools();
        let mapped = (Array.isArray(pools) ? pools : []).map((p: any) => ({
          poolUuid: p.uuid,
          name: p.name,
          description: p.description,
          isDefault: p.is_default_designated
        }));
        return {
          output: { hostPools: mapped },
          message: `Found **${mapped.length}** resource pool(s).`
        };
      }

      case 'os_images': {
        let images = await client.listOsImages();
        return {
          output: { osImages: images },
          message: `Retrieved available OS images.`
        };
      }

      case 'app_images': {
        let images = await client.listAppImages();
        return {
          output: { appImages: images },
          message: `Retrieved available app catalog images.`
        };
      }

      case 'bootable_media': {
        let media = await client.listBootableMedia();
        return {
          output: { bootableMedia: media },
          message: `Retrieved available bootable ISO media.`
        };
      }
    }
  })
  .build();
