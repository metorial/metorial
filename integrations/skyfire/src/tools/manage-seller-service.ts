import { SlateTool } from 'slates';
import { z } from 'zod';
import { SkyfireClient } from '../lib/client';
import { spec } from '../spec';

let sellerServiceOutputSchema = z.object({
  sellerServiceId: z.string().describe('UUID of the seller service'),
  name: z.string().describe('Service name'),
  description: z.string().describe('Service description'),
  tags: z.array(z.string()).describe('Service tags'),
  type: z.string().describe('Service type (API, WEB_PAGE, MCP_SERVER_REMOTE)'),
  price: z.string().describe('Price in USD'),
  priceModel: z.string().describe('Pricing model'),
  minimumTokenAmount: z.string().describe('Minimum token amount for buyers'),
  acceptedTokens: z.array(z.string()).describe('Accepted token types'),
  active: z.boolean().describe('Whether the service is currently active'),
  approved: z.boolean().describe('Whether the service has been approved by Skyfire'),
  createdAt: z.string().describe('ISO 8601 creation timestamp'),
  updatedAt: z.string().describe('ISO 8601 last update timestamp')
});

export let manageSellerService = SlateTool.create(spec, {
  name: 'Manage Seller Service',
  key: 'manage_seller_service',
  description: `Create, update, activate, deactivate, or list seller services. Seller services allow you to offer APIs, tools, or web pages for consumption by buyer agents in the Skyfire marketplace.`,
  instructions: [
    'Use action "list" to see all your seller services.',
    'Use action "get" with sellerServiceId to retrieve a specific service.',
    'Use action "create" to register a new service — provide name, description, type, and acceptedTokens at minimum.',
    'Use action "update" with sellerServiceId and the fields to change.',
    'Use action "activate" or "deactivate" with sellerServiceId to toggle service visibility.',
    'Newly created services must be approved by Skyfire before they can be activated.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'activate', 'deactivate'])
        .describe('The operation to perform'),
      sellerServiceId: z
        .string()
        .optional()
        .describe(
          'UUID of the seller service (required for get, update, activate, deactivate)'
        ),
      name: z.string().optional().describe('Service name (for create/update)'),
      description: z.string().optional().describe('Service description (for create/update)'),
      tags: z.array(z.string()).optional().describe('Service tags (for create/update)'),
      type: z
        .enum(['API', 'WEB_PAGE', 'MCP_SERVER_REMOTE'])
        .optional()
        .describe('Service type (for create)'),
      price: z.string().optional().describe('Price in USD (for create/update)'),
      priceModel: z
        .enum(['PAY_PER_USE', 'SUBSCRIPTION'])
        .optional()
        .describe('Pricing model (for create/update)'),
      minimumTokenAmount: z
        .string()
        .optional()
        .describe('Minimum token amount buyers must authorize (for create/update)'),
      acceptedTokens: z
        .array(z.enum(['kya', 'pay', 'kya+pay']))
        .optional()
        .describe('Accepted token types (for create/update)'),
      openApiSpecUrl: z
        .string()
        .optional()
        .describe('OpenAPI specification URL (for API type services, create/update)'),
      termsOfServiceUrl: z
        .string()
        .optional()
        .describe('Terms of service URL (for create/update)'),
      termsOfServiceRequired: z
        .boolean()
        .optional()
        .describe('Whether accepting terms is required (for create/update)')
    })
  )
  .output(
    z.object({
      services: z
        .array(sellerServiceOutputSchema)
        .optional()
        .describe('List of seller services (for list/get/create actions)'),
      success: z.boolean().describe('Whether the operation succeeded'),
      actionPerformed: z.string().describe('Description of what was done')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SkyfireClient({ token: ctx.auth.token });
    let { action, sellerServiceId } = ctx.input;

    let mapService = (s: {
      id: string;
      name: string;
      description: string;
      tags: string[];
      type: string;
      price: string;
      priceModel: string;
      minimumTokenAmount: string;
      acceptedTokens: string[];
      active: boolean;
      approved: boolean;
      createdAt: string;
      updatedAt: string;
    }) => ({
      sellerServiceId: s.id,
      name: s.name,
      description: s.description,
      tags: s.tags,
      type: s.type,
      price: s.price,
      priceModel: s.priceModel,
      minimumTokenAmount: s.minimumTokenAmount,
      acceptedTokens: s.acceptedTokens,
      active: s.active,
      approved: s.approved,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt
    });

    if (action === 'list') {
      let services = await client.getSellerServices();
      let mapped = services.map(mapService);
      return {
        output: {
          services: mapped,
          success: true,
          actionPerformed: `Listed ${mapped.length} seller service(s).`
        },
        message: `Found **${mapped.length}** seller service(s).`
      };
    }

    if (action === 'get') {
      if (!sellerServiceId) throw new Error('sellerServiceId is required for get action');
      let service = await client.getSellerService(sellerServiceId);
      return {
        output: {
          services: [mapService(service)],
          success: true,
          actionPerformed: `Retrieved service "${service.name}".`
        },
        message: `Retrieved seller service **${service.name}** (${service.active ? 'active' : 'inactive'}, ${service.approved ? 'approved' : 'pending approval'}).`
      };
    }

    if (action === 'create') {
      if (
        !ctx.input.name ||
        !ctx.input.description ||
        !ctx.input.type ||
        !ctx.input.acceptedTokens
      ) {
        throw new Error(
          'name, description, type, and acceptedTokens are required for create action'
        );
      }
      let termsOfService = ctx.input.termsOfServiceUrl
        ? {
            url: ctx.input.termsOfServiceUrl,
            required: ctx.input.termsOfServiceRequired ?? false
          }
        : undefined;

      let service = await client.createSellerService({
        name: ctx.input.name,
        description: ctx.input.description,
        tags: ctx.input.tags,
        type: ctx.input.type,
        price: ctx.input.price,
        priceModel: ctx.input.priceModel,
        minimumTokenAmount: ctx.input.minimumTokenAmount,
        acceptedTokens: ctx.input.acceptedTokens,
        openApiSpecUrl: ctx.input.openApiSpecUrl,
        termsOfService
      });

      return {
        output: {
          services: [mapService(service)],
          success: true,
          actionPerformed: `Created service "${service.name}" (pending approval).`
        },
        message: `Created seller service **${service.name}**. It is pending approval by Skyfire.`
      };
    }

    if (action === 'update') {
      if (!sellerServiceId) throw new Error('sellerServiceId is required for update action');
      let termsOfService = ctx.input.termsOfServiceUrl
        ? {
            url: ctx.input.termsOfServiceUrl,
            required: ctx.input.termsOfServiceRequired ?? false
          }
        : undefined;

      await client.updateSellerService(sellerServiceId, {
        name: ctx.input.name,
        description: ctx.input.description,
        tags: ctx.input.tags,
        price: ctx.input.price,
        minimumTokenAmount: ctx.input.minimumTokenAmount,
        acceptedTokens: ctx.input.acceptedTokens,
        termsOfService
      });

      return {
        output: {
          success: true,
          actionPerformed: `Updated service ${sellerServiceId}.`
        },
        message: `Updated seller service **${sellerServiceId}**.`
      };
    }

    if (action === 'activate') {
      if (!sellerServiceId) throw new Error('sellerServiceId is required for activate action');
      await client.activateSellerService(sellerServiceId);
      return {
        output: {
          success: true,
          actionPerformed: `Activated service ${sellerServiceId}.`
        },
        message: `Activated seller service **${sellerServiceId}**.`
      };
    }

    if (action === 'deactivate') {
      if (!sellerServiceId)
        throw new Error('sellerServiceId is required for deactivate action');
      await client.deactivateSellerService(sellerServiceId);
      return {
        output: {
          success: true,
          actionPerformed: `Deactivated service ${sellerServiceId}.`
        },
        message: `Deactivated seller service **${sellerServiceId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
