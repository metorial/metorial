import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let templateOutputSchema = z.object({
  templateId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  createdOn: z.string().optional(),
  updatedOn: z.string().optional(),
  workspaceId: z.string().optional()
});

export let listTemplatesTool = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `List available templates in a workspace, including both default and custom templates.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z.string().describe('ID of the workspace to list templates from'),
      limit: z.number().optional().describe('Maximum number of templates to return'),
      nextToken: z.string().optional().describe('Pagination token from a previous request')
    })
  )
  .output(
    z.object({
      templates: z.array(templateOutputSchema),
      nextToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listTemplates(ctx.input.workspaceId, {
      limit: ctx.input.limit,
      next: ctx.input.nextToken
    });

    let templates = result.value.map(t => ({
      templateId: t.id,
      name: t.name,
      description: t.description,
      createdOn: t.createdOn,
      updatedOn: t.updatedOn,
      workspaceId: t.workspaceId
    }));

    return {
      output: { templates, nextToken: result.next },
      message: `Found **${templates.length}** template(s).`
    };
  })
  .build();

export let createTemplateFromMuralTool = SlateTool.create(spec, {
  name: 'Create Template From Mural',
  key: 'create_template_from_mural',
  description: `Create a reusable custom template from an existing mural. The template preserves the mural's layout and widgets.`
})
  .input(
    z.object({
      muralId: z.string().describe('ID of the mural to create the template from'),
      name: z.string().describe('Name for the new template'),
      description: z.string().optional().describe('Description of the template')
    })
  )
  .output(templateOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let t = await client.createTemplateFromMural(ctx.input.muralId, {
      name: ctx.input.name,
      description: ctx.input.description
    });

    return {
      output: {
        templateId: t.id,
        name: t.name,
        description: t.description,
        createdOn: t.createdOn,
        updatedOn: t.updatedOn,
        workspaceId: t.workspaceId
      },
      message: `Created template **${t.name}** from mural.`
    };
  })
  .build();

export let createMuralFromTemplateTool = SlateTool.create(spec, {
  name: 'Create Mural From Template',
  key: 'create_mural_from_template',
  description: `Create a new mural based on an existing template. The new mural starts with the template's layout and content.`
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the template to use'),
      workspaceId: z.string().describe('ID of the workspace to create the mural in'),
      roomId: z.string().optional().describe('ID of the room to place the mural in'),
      title: z.string().optional().describe('Title for the new mural')
    })
  )
  .output(
    z.object({
      muralId: z.string(),
      title: z.string().optional(),
      workspaceId: z.string().optional(),
      roomId: z.string().optional(),
      createdOn: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let m = await client.createMuralFromTemplate(ctx.input.templateId, {
      workspaceId: ctx.input.workspaceId,
      roomId: ctx.input.roomId,
      title: ctx.input.title
    });

    return {
      output: {
        muralId: m.id,
        title: m.title,
        workspaceId: m.workspaceId,
        roomId: m.roomId,
        createdOn: m.createdOn
      },
      message: `Created mural **${m.title || m.id}** from template.`
    };
  })
  .build();

export let deleteTemplateTool = SlateTool.create(spec, {
  name: 'Delete Template',
  key: 'delete_template',
  description: `Delete a custom template from the workspace.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the template to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteTemplate(ctx.input.templateId);

    return {
      output: { deleted: true },
      message: `Deleted template **${ctx.input.templateId}**.`
    };
  })
  .build();
