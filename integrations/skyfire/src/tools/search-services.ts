import { SlateTool } from 'slates';
import { z } from 'zod';
import { SkyfireClient } from '../lib/client';
import { spec } from '../spec';

let serviceSchema = z.object({
  serviceId: z.string().describe('UUID of the service'),
  name: z.string().describe('Service name'),
  description: z.string().describe('Service description'),
  tags: z.array(z.string()).describe('Tags associated with the service'),
  type: z.string().describe('Service type (API, WEB_PAGE, MCP_SERVER_REMOTE, FETCH_AGENT)'),
  price: z.string().describe('Price in USD'),
  priceModel: z.string().describe('Pricing model (PAY_PER_USE, SUBSCRIPTION)'),
  minimumTokenAmount: z.string().describe('Minimum token amount buyers must authorize'),
  sellerName: z.string().describe('Name of the seller'),
  sellerId: z.string().describe('UUID of the seller agent'),
  acceptedTokens: z.array(z.string()).describe('Token types accepted (kya, pay, kya+pay)'),
  createdAt: z.string().describe('ISO 8601 creation timestamp'),
  updatedAt: z.string().describe('ISO 8601 last update timestamp')
});

export let searchServices = SlateTool.create(spec, {
  name: 'Search Services',
  key: 'search_services',
  description: `Browse and search the Skyfire service marketplace. Find seller services by tags, retrieve a specific service by ID, list all available services, or view services offered by a specific agent. Also supports fetching all available tags for filtering.`,
  instructions: [
    'To browse all services, omit all optional fields.',
    'To filter by tags, provide an array of tag strings.',
    'To look up a specific service, provide the serviceId.',
    'To see services from a particular seller, provide the agentId.',
    'Set tagsOnly to true to retrieve just the list of available tags.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      serviceId: z.string().optional().describe('UUID of a specific service to retrieve'),
      tags: z
        .array(z.string())
        .optional()
        .describe('Filter services by these tags (e.g., ["ai", "data"])'),
      agentId: z.string().optional().describe('UUID of a seller agent to list their services'),
      tagsOnly: z
        .boolean()
        .optional()
        .describe('Set to true to retrieve only the list of available tags')
    })
  )
  .output(
    z.object({
      services: z.array(serviceSchema).optional().describe('List of matching services'),
      availableTags: z
        .array(z.string())
        .optional()
        .describe('Available tags (when tagsOnly is true)'),
      totalCount: z.number().optional().describe('Total number of services returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SkyfireClient({ token: ctx.auth.token });

    if (ctx.input.tagsOnly) {
      let tagsResult = await client.getDirectoryTags();
      return {
        output: {
          availableTags: tagsResult.data,
          totalCount: tagsResult.data.length
        },
        message: `Found **${tagsResult.data.length}** available tags: ${tagsResult.data.join(', ')}.`
      };
    }

    if (ctx.input.serviceId) {
      let service = await client.getDirectoryService(ctx.input.serviceId);
      let mapped = mapService(service);
      return {
        output: {
          services: [mapped],
          totalCount: 1
        },
        message: `Found service **${service.name}** (${service.type}) by ${service.seller.name} — $${service.price} (${service.priceModel}).`
      };
    }

    let result: any;
    if (ctx.input.tags && ctx.input.tags.length > 0) {
      result = await client.searchServicesByTags(ctx.input.tags);
    } else if (ctx.input.agentId) {
      result = await client.getServicesByAgent(ctx.input.agentId);
    } else {
      result = await client.getDirectoryServices();
    }

    let services = result.data.map(mapService);

    return {
      output: {
        services,
        totalCount: services.length
      },
      message: `Found **${services.length}** service(s) in the marketplace.`
    };
  })
  .build();

let mapService = (s: {
  id: string;
  name: string;
  description: string;
  tags: string[];
  type: string;
  price: string;
  priceModel: string;
  minimumTokenAmount: string;
  seller: { id: string; name: string };
  acceptedTokens: string[];
  createdAt: string;
  updatedAt: string;
}) => ({
  serviceId: s.id,
  name: s.name,
  description: s.description,
  tags: s.tags,
  type: s.type,
  price: s.price,
  priceModel: s.priceModel,
  minimumTokenAmount: s.minimumTokenAmount,
  sellerName: s.seller.name,
  sellerId: s.seller.id,
  acceptedTokens: s.acceptedTokens,
  createdAt: s.createdAt,
  updatedAt: s.updatedAt
});
