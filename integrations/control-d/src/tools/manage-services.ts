import { SlateTool } from 'slates';
import { z } from 'zod';
import { actionDescription, createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageServices = SlateTool.create(spec, {
  name: 'Manage Services',
  key: 'manage_services',
  description: `List or configure service-level DNS rules on a profile. Services represent specific apps/websites (e.g., Facebook, TikTok, Steam) that can be individually blocked, bypassed, or redirected through proxy locations. Supports listing all services on a profile, browsing service categories, and modifying service actions.`,
  instructions: [
    'Use "list_profile" to see all services configured on a profile.',
    'Use "list_categories" to browse available service categories.',
    'Use "list_category" with a categoryId to see services in a specific category.',
    'Use "update" to block, bypass, or redirect a specific service on a profile.'
  ]
})
  .input(
    z.object({
      operation: z
        .enum(['list_profile', 'list_categories', 'list_category', 'update'])
        .describe('Operation to perform'),
      profileId: z
        .string()
        .optional()
        .describe('Profile ID (required for list_profile and update)'),
      categoryId: z
        .string()
        .optional()
        .describe('Service category ID (required for list_category)'),
      serviceId: z
        .string()
        .optional()
        .describe('Service ID (required for update, e.g., "facebook", "tiktok")'),
      action: z
        .number()
        .optional()
        .describe('Action: 0=Block, 1=Bypass, 3=Redirect (required for update)'),
      enabled: z
        .boolean()
        .optional()
        .describe('Enable or disable the service rule (required for update)'),
      via: z
        .string()
        .optional()
        .describe('Proxy location code for Redirect action (e.g., "JFK", "YYZ")')
    })
  )
  .output(
    z.object({
      services: z
        .array(
          z.object({
            serviceId: z.string().describe('Service identifier'),
            name: z.string().describe('Service display name'),
            category: z.string().describe('Category the service belongs to'),
            action: z
              .string()
              .optional()
              .describe('Current action applied (Block, Bypass, Redirect)'),
            enabled: z.boolean().optional().describe('Whether the rule is enabled'),
            locations: z.array(z.string()).optional().describe('Available redirect locations')
          })
        )
        .optional(),
      categories: z
        .array(
          z.object({
            categoryId: z.string().describe('Category identifier'),
            name: z.string().describe('Category name'),
            description: z.string().describe('Category description'),
            count: z.number().describe('Number of services in category')
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { operation, profileId, categoryId, serviceId, action, enabled, via } = ctx.input;

    if (operation === 'list_categories') {
      let categories = await client.listServiceCategories();
      return {
        output: {
          categories: categories.map(c => ({
            categoryId: c.PK,
            name: c.name,
            description: c.description || '',
            count: c.count
          }))
        },
        message: `Found **${categories.length}** service categories.`
      };
    }

    if (operation === 'list_category') {
      if (!categoryId) throw new Error('categoryId is required for list_category');
      let services = await client.listServicesInCategory(categoryId);
      return {
        output: {
          services: services.map(s => ({
            serviceId: s.PK,
            name: s.name,
            category: s.category,
            locations: s.locations
          }))
        },
        message: `Found **${services.length}** services in category "${categoryId}".`
      };
    }

    if (!profileId) throw new Error('profileId is required for this operation');

    if (operation === 'update') {
      if (!serviceId) throw new Error('serviceId is required for update');
      if (action === undefined) throw new Error('action is required for update');
      if (enabled === undefined) throw new Error('enabled is required for update');

      await client.modifyProfileService(profileId, serviceId, {
        action,
        status: enabled ? 1 : 0,
        via
      });

      let services = await client.listProfileServices(profileId);
      let svc = services.find(s => s.PK === serviceId);
      return {
        output: {
          services: svc
            ? [
                {
                  serviceId: svc.PK,
                  name: svc.name,
                  category: svc.category,
                  action: svc.action
                    ? actionDescription(svc.action.do, svc.action.via)
                    : undefined,
                  enabled: svc.action ? svc.action.status === 1 : undefined,
                  locations: svc.locations
                }
              ]
            : []
        },
        message: `Updated service **${serviceId}** on profile ${profileId} to **${actionDescription(action, via)}** (${enabled ? 'enabled' : 'disabled'}).`
      };
    }

    // list_profile
    let services = await client.listProfileServices(profileId);
    let configuredServices = services.filter(s => s.action && s.action.status === 1);
    return {
      output: {
        services: services.map(s => ({
          serviceId: s.PK,
          name: s.name,
          category: s.category,
          action: s.action ? actionDescription(s.action.do, s.action.via) : undefined,
          enabled: s.action ? s.action.status === 1 : undefined,
          locations: s.locations
        }))
      },
      message: `Found **${services.length}** services on profile ${profileId} (**${configuredServices.length}** active).`
    };
  })
  .build();
