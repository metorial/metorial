import { pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import {
  cleanBody,
  companySlugFor,
  companySlugInput,
  createClient,
  listMetadata,
  mapProduct,
  mapProject,
  paginationInputShape,
  paginationOutputShape,
  paginationParams,
  productSchema,
  projectSchema
} from './shared';

export let listProducts = SlateTool.create(spec, {
  name: 'List Products',
  key: 'list_products',
  description:
    'Lists Fiken products for a company with filters for product name, product number, active status, and created/modified dates.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      companySlug: companySlugInput,
      page: paginationInputShape.page,
      pageSize: paginationInputShape.pageSize,
      name: z.string().optional().describe('Exact product name filter.'),
      productNumber: z.string().optional(),
      active: z.boolean().optional(),
      createdDate: z.string().optional().describe('YYYY-MM-DD. Exact product creation date.'),
      createdDateFrom: z
        .string()
        .optional()
        .describe('YYYY-MM-DD. Return products created on or after this date.'),
      createdDateTo: z
        .string()
        .optional()
        .describe('YYYY-MM-DD. Return products created on or before this date.'),
      createdDateAfter: z
        .string()
        .optional()
        .describe('YYYY-MM-DD. Return products created strictly after this date.'),
      createdDateBefore: z
        .string()
        .optional()
        .describe('YYYY-MM-DD. Return products created strictly before this date.'),
      lastModified: z.string().optional().describe('YYYY-MM-DD. Exact product modified date.'),
      lastModifiedFrom: z
        .string()
        .optional()
        .describe('YYYY-MM-DD. Return products modified on or after this date.'),
      lastModifiedTo: z
        .string()
        .optional()
        .describe('YYYY-MM-DD. Return products modified on or before this date.'),
      lastModifiedAfter: z
        .string()
        .optional()
        .describe('YYYY-MM-DD. Return products modified strictly after this date.'),
      lastModifiedBefore: z
        .string()
        .optional()
        .describe('YYYY-MM-DD. Return products modified strictly before this date.')
    })
  )
  .output(
    z.object({
      companySlug: z.string(),
      products: z.array(productSchema),
      ...paginationOutputShape
    })
  )
  .handleInvocation(async ctx => {
    let companySlug = companySlugFor(ctx, ctx.input.companySlug);
    let client = createClient(ctx);
    let response = await client.listProducts(
      companySlug,
      pickDefined({
        ...paginationParams(ctx.input),
        name: ctx.input.name,
        productNumber: ctx.input.productNumber,
        active: ctx.input.active,
        createdDate: ctx.input.createdDate,
        createdDateGe: ctx.input.createdDateFrom,
        createdDateLe: ctx.input.createdDateTo,
        createdDateGt: ctx.input.createdDateAfter,
        createdDateLt: ctx.input.createdDateBefore,
        lastModified: ctx.input.lastModified,
        lastModifiedGe: ctx.input.lastModifiedFrom,
        lastModifiedLe: ctx.input.lastModifiedTo,
        lastModifiedGt: ctx.input.lastModifiedAfter,
        lastModifiedLt: ctx.input.lastModifiedBefore
      })
    );
    let products = response.items.map(mapProduct);

    return {
      output: {
        companySlug,
        products,
        ...listMetadata(response)
      },
      message: `Found **${products.length}** Fiken product${products.length === 1 ? '' : 's'}.`
    };
  })
  .build();

export let getProduct = SlateTool.create(spec, {
  name: 'Get Product',
  key: 'get_product',
  description: 'Retrieves one Fiken product by product id.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      companySlug: companySlugInput,
      productId: z.number().int().positive().describe('Fiken product id.')
    })
  )
  .output(
    z.object({
      companySlug: z.string(),
      product: productSchema
    })
  )
  .handleInvocation(async ctx => {
    let companySlug = companySlugFor(ctx, ctx.input.companySlug);
    let client = createClient(ctx);
    let product = mapProduct(await client.getProduct(companySlug, ctx.input.productId));

    return {
      output: {
        companySlug,
        product
      },
      message: `Retrieved Fiken product **${product.name ?? ctx.input.productId}**.`
    };
  })
  .build();

export let createProduct = SlateTool.create(spec, {
  name: 'Create Product',
  key: 'create_product',
  description: 'Creates a Fiken product that can be reused on invoice, sale, and draft lines.',
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      companySlug: companySlugInput,
      name: z.string().min(1).describe('Product name.'),
      incomeAccount: z.string().describe('Income account, for example 3000.'),
      vatType: z.string().describe('Fiken VAT type, for example HIGH or NONE.'),
      active: z
        .boolean()
        .optional()
        .describe('Whether the product is active. Defaults to true.'),
      unitPrice: z.number().int().optional().describe('Net unit price in cents.'),
      productNumber: z.string().optional(),
      stock: z.number().optional(),
      note: z.string().max(200).optional()
    })
  )
  .output(
    z.object({
      companySlug: z.string(),
      productId: z.number().optional(),
      location: z.string().optional(),
      product: productSchema.optional()
    })
  )
  .handleInvocation(async ctx => {
    let companySlug = companySlugFor(ctx, ctx.input.companySlug);
    let client = createClient(ctx);
    let created = await client.createProduct(
      companySlug,
      cleanBody({
        name: ctx.input.name,
        incomeAccount: ctx.input.incomeAccount,
        vatType: ctx.input.vatType,
        active: ctx.input.active ?? true,
        unitPrice: ctx.input.unitPrice,
        productNumber: ctx.input.productNumber,
        stock: ctx.input.stock,
        note: ctx.input.note
      })
    );
    let product = created.record ? mapProduct(created.record) : undefined;

    return {
      output: {
        companySlug,
        productId: product?.productId ?? created.id,
        location: created.location,
        product
      },
      message: `Created Fiken product **${product?.name ?? ctx.input.name}**.`
    };
  })
  .build();

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description:
    'Lists Fiken projects for a company with filters for completion status, name, and project number.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      companySlug: companySlugInput,
      page: paginationInputShape.page,
      pageSize: paginationInputShape.pageSize,
      completed: z.boolean().optional(),
      name: z.string().optional(),
      number: z.string().optional().describe('Project number.')
    })
  )
  .output(
    z.object({
      companySlug: z.string(),
      projects: z.array(projectSchema),
      ...paginationOutputShape
    })
  )
  .handleInvocation(async ctx => {
    let companySlug = companySlugFor(ctx, ctx.input.companySlug);
    let client = createClient(ctx);
    let response = await client.listProjects(
      companySlug,
      pickDefined({
        ...paginationParams(ctx.input),
        completed: ctx.input.completed,
        name: ctx.input.name,
        number: ctx.input.number
      })
    );
    let projects = response.items.map(mapProject);

    return {
      output: {
        companySlug,
        projects,
        ...listMetadata(response)
      },
      message: `Found **${projects.length}** Fiken project${projects.length === 1 ? '' : 's'}.`
    };
  })
  .build();

export let getProject = SlateTool.create(spec, {
  name: 'Get Project',
  key: 'get_project',
  description: 'Retrieves one Fiken project by project id.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      companySlug: companySlugInput,
      projectId: z.number().int().positive().describe('Fiken project id.')
    })
  )
  .output(
    z.object({
      companySlug: z.string(),
      project: projectSchema
    })
  )
  .handleInvocation(async ctx => {
    let companySlug = companySlugFor(ctx, ctx.input.companySlug);
    let client = createClient(ctx);
    let project = mapProject(await client.getProject(companySlug, ctx.input.projectId));

    return {
      output: {
        companySlug,
        project
      },
      message: `Retrieved Fiken project **${project.name ?? ctx.input.projectId}**.`
    };
  })
  .build();

export let createProject = SlateTool.create(spec, {
  name: 'Create Project',
  key: 'create_project',
  description: 'Creates a Fiken project for project accounting and document association.',
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      companySlug: companySlugInput,
      number: z.string().describe('Project number.'),
      name: z.string().min(1).describe('Project name.'),
      startDate: z.string().describe('Project start date, YYYY-MM-DD.'),
      description: z.string().optional(),
      endDate: z.string().optional().describe('Project end date, YYYY-MM-DD.'),
      contactId: z.number().int().positive().optional(),
      completed: z.boolean().optional()
    })
  )
  .output(
    z.object({
      companySlug: z.string(),
      projectId: z.number().optional(),
      location: z.string().optional(),
      project: projectSchema.optional()
    })
  )
  .handleInvocation(async ctx => {
    let companySlug = companySlugFor(ctx, ctx.input.companySlug);
    let client = createClient(ctx);
    let created = await client.createProject(
      companySlug,
      cleanBody({
        number: ctx.input.number,
        name: ctx.input.name,
        startDate: ctx.input.startDate,
        description: ctx.input.description,
        endDate: ctx.input.endDate,
        contactId: ctx.input.contactId,
        completed: ctx.input.completed
      })
    );
    let project = created.record ? mapProject(created.record) : undefined;

    return {
      output: {
        companySlug,
        projectId: project?.projectId ?? created.id,
        location: created.location,
        project
      },
      message: `Created Fiken project **${project?.name ?? ctx.input.name}**.`
    };
  })
  .build();
