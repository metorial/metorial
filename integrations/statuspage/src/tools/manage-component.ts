import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageComponent = SlateTool.create(spec, {
  name: 'Manage Component',
  key: 'manage_component',
  description: `Create, update, or delete a component on the status page. Components represent infrastructure pieces like APIs, apps, and services.
- To **create**: omit \`componentId\` and provide \`name\` at minimum.
- To **update**: provide \`componentId\` and the fields to change (e.g. \`status\`, \`name\`, \`description\`).
- To **delete**: provide \`componentId\` and set \`delete\` to \`true\`.`,
  instructions: [
    'Valid statuses are: operational, degraded_performance, partial_outage, major_outage.'
  ]
})
  .input(
    z.object({
      componentId: z
        .string()
        .optional()
        .describe(
          'ID of an existing component to update or delete. Omit to create a new component.'
        ),
      name: z.string().optional().describe('Name of the component'),
      description: z.string().optional().describe('Description of the component'),
      status: z
        .enum(['operational', 'degraded_performance', 'partial_outage', 'major_outage'])
        .optional()
        .describe('Status of the component'),
      showcase: z
        .boolean()
        .optional()
        .describe('Whether the component is shown on the status page'),
      onlyShowIfDegraded: z
        .boolean()
        .optional()
        .describe('Only show the component when it is not operational'),
      groupId: z
        .string()
        .optional()
        .nullable()
        .describe('ID of the component group to assign to, or null to ungroup'),
      delete: z.boolean().optional().describe('Set to true to delete the component')
    })
  )
  .output(
    z.object({
      componentId: z.string().describe('Unique identifier of the component'),
      name: z.string().optional().describe('Name of the component'),
      status: z.string().optional().describe('Current status of the component'),
      description: z.string().optional().nullable().describe('Description of the component'),
      showcase: z.boolean().optional().describe('Whether the component is showcased'),
      groupId: z.string().optional().nullable().describe('Component group ID'),
      automationEmail: z
        .string()
        .optional()
        .nullable()
        .describe('Automation email for the component'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      deleted: z.boolean().optional().describe('Whether the component was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, pageId: ctx.config.pageId });

    if (ctx.input.delete && ctx.input.componentId) {
      await client.deleteComponent(ctx.input.componentId);
      return {
        output: { componentId: ctx.input.componentId, deleted: true },
        message: `Deleted component \`${ctx.input.componentId}\`.`
      };
    }

    let data: Record<string, any> = {};
    if (ctx.input.name !== undefined) data.name = ctx.input.name;
    if (ctx.input.description !== undefined) data.description = ctx.input.description;
    if (ctx.input.status !== undefined) data.status = ctx.input.status;
    if (ctx.input.showcase !== undefined) data.showcase = ctx.input.showcase;
    if (ctx.input.onlyShowIfDegraded !== undefined)
      data.only_show_if_degraded = ctx.input.onlyShowIfDegraded;
    if (ctx.input.groupId !== undefined) data.group_id = ctx.input.groupId;

    let component: any;
    if (ctx.input.componentId) {
      component = await client.updateComponent(ctx.input.componentId, data);
    } else {
      component = await client.createComponent(data);
    }

    let output = {
      componentId: component.id,
      name: component.name,
      status: component.status,
      description: component.description,
      showcase: component.showcase,
      groupId: component.group_id,
      automationEmail: component.automation_email,
      createdAt: component.created_at,
      updatedAt: component.updated_at
    };

    let action = ctx.input.componentId ? 'Updated' : 'Created';
    return {
      output,
      message: `${action} component **${component.name}** with status \`${component.status}\`.`
    };
  })
  .build();
