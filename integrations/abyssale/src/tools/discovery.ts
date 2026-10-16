import { SlateTool } from 'slates';
import { z } from 'zod';
import { bannerOutputSchema, mapBanner } from '../lib/banner';
import { AbyssaleClient } from '../lib/client';
import { spec } from '../spec';

let rawSchema = z.record(z.string(), z.any());
let designType = z.enum(['static', 'animated', 'printer', 'printer_multipage']);

export let getWorkspace = SlateTool.create(spec, {
  key: 'get_workspace',
  name: 'Get Workspace',
  description:
    'Verify the connected API key and retrieve the workspace name it belongs to. This does not return a user profile or account ID.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      company: z.string().optional(),
      version: z.string().optional(),
      raw: rawSchema
    })
  )
  .handleInvocation(async ctx => {
    let result = await new AbyssaleClient(ctx.auth).getWorkspace();
    return {
      output: { company: result.company, version: result.version, raw: result },
      message: result.company
        ? `Connected workspace: ${result.company}.`
        : 'The API key was verified.'
    };
  })
  .build();

let creditBlock = z.object({
  available: z.number().nullable(),
  limit: z.number().nullable(),
  consumed: z.number(),
  extra: z.number()
});
export let getCredits = SlateTool.create(spec, {
  key: 'get_credits',
  name: 'Get Credits',
  description:
    'Retrieve remaining generation and AI credits for the current workspace and billing period. A null available balance or limit means unlimited.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(z.object({ generationCredits: creditBlock, aiCredits: creditBlock, raw: rawSchema }))
  .handleInvocation(async ctx => {
    let result = await new AbyssaleClient(ctx.auth).getCredits();
    return {
      output: {
        generationCredits: result.generation_credits,
        aiCredits: result.ai_credits,
        raw: result
      },
      message: 'Retrieved the current generation and AI credit balances.'
    };
  })
  .build();

export let getDesign = SlateTool.create(spec, {
  key: 'get_design',
  name: 'Get Design',
  description:
    'Inspect a design before generation: formats, elements, variables, print settings, animation, or multipage pages and per-page elements. Enable advanced to include group layers.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      designId: z.string().describe('Design ID. Call list_designs to discover designs.'),
      advanced: z.boolean().optional()
    })
  )
  .output(
    z.object({
      designId: z.string(),
      name: z.string(),
      type: z.string(),
      formats: z.array(rawSchema).optional(),
      elements: z.array(rawSchema).optional(),
      variables: rawSchema.optional(),
      pages: z.array(rawSchema).optional(),
      elementsPerPage: z.record(z.string(), z.array(rawSchema)).optional(),
      raw: rawSchema
    })
  )
  .handleInvocation(async ctx => {
    let result = await new AbyssaleClient(ctx.auth).getDesign(
      ctx.input.designId,
      ctx.input.advanced
    );
    return {
      output: {
        designId: result.id,
        name: result.name,
        type: result.type,
        formats: result.formats,
        elements: result.elements,
        variables: result.variables,
        pages: result.pages,
        elementsPerPage: result.elements_per_page,
        raw: result
      },
      message: `Retrieved design ${result.name}.`
    };
  })
  .build();

export let getGeneratedFile = SlateTool.create(spec, {
  key: 'get_generated_file',
  name: 'Get Generated File',
  description:
    'Retrieve a previously generated image, video, GIF, PDF, or HTML5 ZIP file by its banner ID, including a downloadable file and complete provider metadata.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      bannerId: z
        .string()
        .describe('Generated banner ID from generate_image or get_generation_status.')
    })
  )
  .output(bannerOutputSchema)
  .handleInvocation(async ctx => {
    let result = await new AbyssaleClient(ctx.auth).getBanner(ctx.input.bannerId);
    await ctx.addAttachment({
      type: 'url',
      url: result.file.url,
      filename: result.file.filename
    });
    return {
      output: mapBanner(result),
      message: `Retrieved ${result.file.type.toUpperCase()} file ${result.id}.`
    };
  })
  .build();

export let listWorkspaceTemplates = SlateTool.create(spec, {
  key: 'list_workspace_templates',
  name: 'List Workspace Templates',
  description:
    'Discover shared workspace master templates to duplicate into a project. These are separate from project designs returned by list_designs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      categoryId: z
        .string()
        .optional()
        .describe(
          'Category ID from list_workspace_template_categories; omit to include templates at the workspace root.'
        ),
      designType: designType.optional()
    })
  )
  .output(
    z.object({
      templates: z.array(
        z.object({
          workspaceTemplateId: z.string(),
          name: z.string(),
          type: z.string(),
          createdAt: z.string(),
          updatedAt: z.string(),
          previewUrl: z.string().optional(),
          categoryId: z.string().nullable().optional(),
          categoryName: z.string().nullable().optional(),
          raw: rawSchema
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let result = await new AbyssaleClient(ctx.auth).listWorkspaceTemplates(ctx.input);
    return {
      output: {
        templates: result.map(template => ({
          workspaceTemplateId: template.id,
          name: template.name,
          type: template.type,
          createdAt: String(template.created_at),
          updatedAt: String(template.updated_at),
          previewUrl: template.preview_url,
          categoryId: template.category_id,
          categoryName: template.category_name,
          raw: template
        }))
      },
      message: `Found ${result.length} workspace template(s).`
    };
  })
  .build();

export let listWorkspaceTemplateCategories = SlateTool.create(spec, {
  key: 'list_workspace_template_categories',
  name: 'List Workspace Template Categories',
  description:
    'Discover category IDs and names used to organize and filter workspace master templates.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      categories: z.array(
        z.object({
          categoryId: z.string(),
          name: z.string(),
          color: z.string().optional(),
          icon: z.string().optional(),
          createdAt: z.string().optional(),
          raw: rawSchema
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let result = await new AbyssaleClient(ctx.auth).listWorkspaceTemplateCategories();
    return {
      output: {
        categories: result.map(category => ({
          categoryId: category.id,
          name: category.name,
          color: category.color,
          icon: category.icon,
          createdAt:
            category.created_at === undefined ? undefined : String(category.created_at),
          raw: category
        }))
      },
      message: `Found ${result.length} workspace template category/categories.`
    };
  })
  .build();
