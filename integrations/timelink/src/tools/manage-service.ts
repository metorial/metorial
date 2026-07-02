import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let serviceOutputSchema = z.object({
  serviceId: z.number().describe('Unique identifier of the service'),
  name: z.string().describe('Name of the service'),
  info: z.string().optional().describe('Description or additional information'),
  color: z.string().optional().describe('Color code for the service'),
  acronym: z.string().optional().describe('Short acronym for the service'),
  active: z.boolean().optional().describe('Whether the service is active'),
  externalId: z.string().optional().describe('External ID for syncing with other systems')
});

export let listServicesTool = SlateTool.create(spec, {
  name: 'List Services',
  key: 'list_services',
  description: `Retrieve all services (activity types) in Timelink. Services categorize the type of work being done in time entries. Use this to find service IDs for creating or filtering time entries.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      services: z.array(serviceOutputSchema).describe('List of services')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let services = await client.listServices();

    let mapped = services.map(s => ({
      serviceId: s.id,
      name: s.name,
      info: s.info,
      color: s.color,
      acronym: s.acronym,
      active: s.active,
      externalId: s.externalId ?? s.external_id
    }));

    return {
      output: { services: mapped },
      message: `Found **${mapped.length}** service(s).`
    };
  })
  .build();

export let createServiceTool = SlateTool.create(spec, {
  name: 'Create Service',
  key: 'create_service',
  description: `Create a new service (activity type) in Timelink. Services define the type of work performed and can be assigned to time entries.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the service'),
      info: z
        .string()
        .optional()
        .describe('Description or additional information about the service'),
      color: z.string().optional().describe('Color code for the service (e.g., hex color)'),
      acronym: z.string().optional().describe('Short acronym for the service'),
      active: z
        .boolean()
        .optional()
        .describe('Whether the service is active (defaults to true)'),
      externalId: z.string().optional().describe('External ID for syncing with other systems')
    })
  )
  .output(serviceOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let s = await client.createService(ctx.input);

    return {
      output: {
        serviceId: s.id,
        name: s.name,
        info: s.info,
        color: s.color,
        acronym: s.acronym,
        active: s.active,
        externalId: s.externalId ?? s.external_id
      },
      message: `Created service **${s.name}** (ID: ${s.id}).`
    };
  })
  .build();

export let updateServiceTool = SlateTool.create(spec, {
  name: 'Update Service',
  key: 'update_service',
  description: `Update an existing service (activity type) in Timelink. Only the provided fields will be updated; omitted fields remain unchanged.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      serviceId: z.number().describe('ID of the service to update'),
      name: z.string().optional().describe('New name for the service'),
      info: z.string().optional().describe('New description or additional information'),
      color: z.string().optional().describe('New color code for the service'),
      acronym: z.string().optional().describe('New acronym for the service'),
      active: z.boolean().optional().describe('Whether the service is active'),
      externalId: z.string().optional().describe('External ID for syncing with other systems')
    })
  )
  .output(serviceOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { serviceId, ...updateData } = ctx.input;
    let s = await client.updateService(serviceId, updateData);

    return {
      output: {
        serviceId: s.id,
        name: s.name,
        info: s.info,
        color: s.color,
        acronym: s.acronym,
        active: s.active,
        externalId: s.externalId ?? s.external_id
      },
      message: `Updated service **${s.name}** (ID: ${s.id}).`
    };
  })
  .build();
