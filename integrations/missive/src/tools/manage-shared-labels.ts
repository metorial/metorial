import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let labelOutputSchema = z.object({
  labelId: z.string().describe('Shared label ID'),
  name: z.string().optional().describe('Label name'),
  color: z.string().optional().describe('Label color'),
  parentId: z.string().optional().describe('Parent label ID'),
  organizationId: z.string().optional().describe('Organization ID'),
  visibility: z.string().optional().describe('"organization" or "delegates"')
});

export let manageSharedLabels = SlateTool.create(spec, {
  name: 'Manage Shared Labels',
  key: 'manage_shared_labels',
  description: `Create, update, or list shared labels used to organize conversations. Labels support hierarchical nesting, color coding, and visibility controls.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update']).describe('Action to perform'),
      labelId: z.string().optional().describe('Label ID (required for update)'),
      organizationId: z.string().optional().describe('Organization ID (required for create)'),
      name: z.string().optional().describe('Label name'),
      color: z.string().optional().describe('Hex color (e.g. "#FF0000")'),
      parentId: z.string().optional().describe('Parent label ID for nesting'),
      visibility: z
        .enum(['organization', 'delegates'])
        .optional()
        .describe('Who can see the label'),
      shareWithOrganization: z.boolean().optional().describe('Share with entire organization'),
      shareWithTeam: z.string().optional().describe('Team ID to share with'),
      shareWithUsers: z.array(z.string()).optional().describe('User IDs to share with'),
      limit: z
        .number()
        .min(1)
        .max(200)
        .optional()
        .describe('Max labels to return (list only)'),
      offset: z.number().optional().describe('Pagination offset (list only)')
    })
  )
  .output(
    z.object({
      labels: z.array(labelOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let params: Record<string, string | number> = {};
      if (ctx.input.limit) params.limit = ctx.input.limit;
      if (ctx.input.offset) params.offset = ctx.input.offset;

      let data = await client.listSharedLabels(params);
      let labels = (data.shared_labels || []).map((l: any) => ({
        labelId: l.id,
        name: l.name,
        color: l.color,
        parentId: l.parent?.id,
        organizationId: l.organization?.id,
        visibility: l.visibility
      }));

      return {
        output: { labels },
        message: `Retrieved **${labels.length}** shared labels.`
      };
    }

    let fields: Record<string, any> = {};
    if (ctx.input.name) fields.name = ctx.input.name;
    if (ctx.input.color) fields.color = ctx.input.color;
    if (ctx.input.parentId) fields.parent = ctx.input.parentId;
    if (ctx.input.visibility) fields.visibility = ctx.input.visibility;
    if (ctx.input.shareWithOrganization !== undefined)
      fields.share_with_organization = ctx.input.shareWithOrganization;
    if (ctx.input.shareWithTeam) fields.share_with_team = ctx.input.shareWithTeam;
    if (ctx.input.shareWithUsers) fields.share_with_users = ctx.input.shareWithUsers;

    if (ctx.input.action === 'create') {
      if (!ctx.input.organizationId)
        throw new Error('organizationId is required for creating labels');
      if (!ctx.input.name) throw new Error('name is required for creating labels');
      fields.organization = ctx.input.organizationId;
      let data = await client.createSharedLabels(fields);
      let labels = Array.isArray(data.shared_labels)
        ? data.shared_labels
        : [data.shared_labels];
      return {
        output: {
          labels: labels.map((l: any) => ({
            labelId: l.id,
            name: l.name,
            color: l.color,
            parentId: l.parent?.id,
            organizationId: l.organization?.id,
            visibility: l.visibility
          }))
        },
        message: `Created shared label **${ctx.input.name}**.`
      };
    }

    // update
    if (!ctx.input.labelId) throw new Error('labelId is required for updating labels');
    let data = await client.updateSharedLabels([ctx.input.labelId], fields);
    let labels = Array.isArray(data.shared_labels) ? data.shared_labels : [data.shared_labels];
    return {
      output: {
        labels: labels.map((l: any) => ({
          labelId: l.id,
          name: l.name,
          color: l.color,
          parentId: l.parent?.id,
          organizationId: l.organization?.id,
          visibility: l.visibility
        }))
      },
      message: `Updated shared label **${ctx.input.labelId}**.`
    };
  })
  .build();
