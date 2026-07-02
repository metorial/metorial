import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let componentSchema = z.object({
  componentId: z.string().describe('Unique identifier of the component'),
  name: z.string().describe('Name of the component'),
  status: z
    .string()
    .describe(
      'Current status: operational, degraded_performance, partial_outage, or major_outage'
    ),
  description: z.string().optional().nullable().describe('Description of the component'),
  position: z.number().optional().describe('Display position on the page'),
  showcase: z.boolean().optional().describe('Whether the component is showcased'),
  groupId: z
    .string()
    .optional()
    .nullable()
    .describe('ID of the component group this belongs to'),
  onlyShowIfDegraded: z.boolean().optional().describe('Whether to only show when degraded'),
  automationEmail: z
    .string()
    .optional()
    .nullable()
    .describe('Email address for automated status updates'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

export let listComponents = SlateTool.create(spec, {
  name: 'List Components',
  key: 'list_components',
  description: `List all components on the status page. Returns each component's name, status, group, and configuration. Use this to get an overview of all infrastructure pieces being tracked.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      components: z.array(componentSchema).describe('List of components')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, pageId: ctx.config.pageId });
    let raw = await client.listComponents();

    let components = raw.map((c: any) => ({
      componentId: c.id,
      name: c.name,
      status: c.status,
      description: c.description,
      position: c.position,
      showcase: c.showcase,
      groupId: c.group_id,
      onlyShowIfDegraded: c.only_show_if_degraded,
      automationEmail: c.automation_email,
      createdAt: c.created_at,
      updatedAt: c.updated_at
    }));

    return {
      output: { components },
      message: `Found **${components.length}** component(s).`
    };
  })
  .build();
