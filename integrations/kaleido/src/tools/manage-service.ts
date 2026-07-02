import { SlateTool } from 'slates';
import { z } from 'zod';
import { KaleidoClient } from '../lib/client';
import { spec } from '../spec';

export let manageService = SlateTool.create(spec, {
  name: 'Manage Service',
  key: 'manage_service',
  description: `Create, list, retrieve, or delete services within an environment. Services include utility services like HD Wallets, IPFS, Document Exchange, App2App Messaging, Token Factory, and more.
Each service is bound to a membership and runs alongside the blockchain nodes.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'get', 'list', 'delete']).describe('Action to perform'),
      consortiumId: z.string().describe('Consortium ID'),
      environmentId: z.string().describe('Environment ID'),
      serviceId: z.string().optional().describe('Service ID (required for get, delete)'),
      name: z.string().optional().describe('Service name (required for create)'),
      serviceType: z
        .string()
        .optional()
        .describe(
          'Service type identifier, e.g. "hdwallet", "ipfs", "documentstore", "app2app", "tether", "idregistry" (required for create)'
        ),
      membershipId: z
        .string()
        .optional()
        .describe('Membership ID that owns the service (required for create)'),
      size: z.enum(['small', 'medium', 'large']).optional().describe('Service size')
    })
  )
  .output(
    z.object({
      services: z
        .array(
          z.object({
            serviceId: z.string().describe('Service ID'),
            name: z.string().describe('Service name'),
            serviceType: z.string().optional().describe('Service type'),
            membershipId: z.string().optional().describe('Owning membership ID'),
            state: z.string().optional().describe('Service state'),
            size: z.string().optional().describe('Service size'),
            urls: z.any().optional().describe('Service connection URLs')
          })
        )
        .optional()
        .describe('List of services (for list action)'),
      serviceId: z.string().optional().describe('Service ID'),
      name: z.string().optional().describe('Service name'),
      serviceType: z.string().optional().describe('Service type'),
      membershipId: z.string().optional().describe('Membership ID'),
      state: z.string().optional().describe('Service state'),
      urls: z.any().optional().describe('Service connection URLs'),
      deleted: z.boolean().optional().describe('Whether the service was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new KaleidoClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    if (ctx.input.action === 'list') {
      let services = await client.listServices(
        ctx.input.consortiumId,
        ctx.input.environmentId
      );
      let mapped = services.map((s: any) => ({
        serviceId: s._id,
        name: s.name,
        serviceType: s.service || undefined,
        membershipId: s.membership_id || undefined,
        state: s.state || undefined,
        size: s.size || undefined,
        urls: s.urls || undefined
      }));

      return {
        output: { services: mapped },
        message: `Found **${mapped.length}** service(s).${mapped.length > 0 ? ` ${mapped.map(s => `**${s.name}** (${s.serviceType || 'unknown'}, ${s.state || 'unknown'})`).join(', ')}` : ''}`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) throw new Error('Name is required');
      if (!ctx.input.serviceType) throw new Error('Service type is required');
      if (!ctx.input.membershipId) throw new Error('Membership ID is required');

      let result = await client.createService(
        ctx.input.consortiumId,
        ctx.input.environmentId,
        {
          name: ctx.input.name,
          service: ctx.input.serviceType,
          membership_id: ctx.input.membershipId,
          size: ctx.input.size
        }
      );

      return {
        output: {
          serviceId: result._id,
          name: result.name,
          serviceType: result.service,
          membershipId: result.membership_id,
          state: result.state,
          urls: result.urls
        },
        message: `Created service **${result.name}** (\`${result._id}\`) of type ${result.service}.`
      };
    }

    if (!ctx.input.serviceId) throw new Error('Service ID is required');

    if (ctx.input.action === 'get') {
      let result = await client.getService(
        ctx.input.consortiumId,
        ctx.input.environmentId,
        ctx.input.serviceId
      );
      return {
        output: {
          serviceId: result._id,
          name: result.name,
          serviceType: result.service,
          membershipId: result.membership_id,
          state: result.state,
          urls: result.urls
        },
        message: `Service **${result.name}** — type: ${result.service || 'unknown'}, state: ${result.state || 'unknown'}.`
      };
    }

    // delete
    await client.deleteService(
      ctx.input.consortiumId,
      ctx.input.environmentId,
      ctx.input.serviceId
    );
    return {
      output: {
        serviceId: ctx.input.serviceId,
        deleted: true
      },
      message: `Deleted service \`${ctx.input.serviceId}\`.`
    };
  })
  .build();
