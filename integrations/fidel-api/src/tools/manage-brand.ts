import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let brandSchema = z.object({
  brandId: z.string().describe('Unique identifier of the brand'),
  name: z.string().describe('Name of the brand'),
  logoURL: z.string().optional().describe('URL to the brand logo'),
  live: z.boolean().optional().describe('Whether the brand is in live mode'),
  accountId: z.string().optional().describe('Account ID the brand belongs to'),
  consent: z.boolean().optional().describe('Whether the brand has given consent'),
  created: z.string().optional().describe('ISO 8601 date when the brand was created'),
  updated: z.string().optional().describe('ISO 8601 date when the brand was last updated'),
  metadata: z
    .record(z.string(), z.any())
    .optional()
    .describe('Custom metadata attached to the brand')
});

export let createBrand = SlateTool.create(spec, {
  name: 'Create Brand',
  key: 'create_brand',
  description: `Creates a new Brand in Fidel API. Brands aggregate different locations that a brand operates at for transaction tracking. Brands are shared across Programs.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the brand'),
      logoURL: z.string().optional().describe('URL to the brand logo image'),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom metadata to attach to the brand')
    })
  )
  .output(brandSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let brand = await client.createBrand({
      name: ctx.input.name,
      logoURL: ctx.input.logoURL,
      metadata: ctx.input.metadata
    });

    return {
      output: {
        brandId: brand.id,
        name: brand.name,
        logoURL: brand.logoURL,
        live: brand.live,
        accountId: brand.accountId,
        consent: brand.consent,
        created: brand.created,
        updated: brand.updated,
        metadata: brand.metadata
      },
      message: `Brand **${brand.name}** created with ID \`${brand.id}\`.`
    };
  })
  .build();

export let getBrand = SlateTool.create(spec, {
  name: 'Get Brand',
  key: 'get_brand',
  description: `Retrieves details of a specific Brand by its ID.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      brandId: z.string().describe('ID of the brand to retrieve')
    })
  )
  .output(brandSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let brand = await client.getBrand(ctx.input.brandId);

    return {
      output: {
        brandId: brand.id,
        name: brand.name,
        logoURL: brand.logoURL,
        live: brand.live,
        accountId: brand.accountId,
        consent: brand.consent,
        created: brand.created,
        updated: brand.updated,
        metadata: brand.metadata
      },
      message: `Retrieved brand **${brand.name}** (\`${brand.id}\`).`
    };
  })
  .build();

export let listBrands = SlateTool.create(spec, {
  name: 'List Brands',
  key: 'list_brands',
  description: `Lists all Brands in your Fidel API account. Brands are shared across programs and represent the business entities whose transactions are tracked.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      start: z.number().optional().describe('Offset for pagination'),
      limit: z.number().optional().describe('Maximum number of brands to return')
    })
  )
  .output(
    z.object({
      brands: z.array(brandSchema).describe('List of brands'),
      count: z.number().optional().describe('Total number of brands')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.listBrands({
      start: ctx.input.start,
      limit: ctx.input.limit
    });

    let items = data?.items ?? [];
    let brands = items.map((b: any) => ({
      brandId: b.id,
      name: b.name,
      logoURL: b.logoURL,
      live: b.live,
      accountId: b.accountId,
      consent: b.consent,
      created: b.created,
      updated: b.updated,
      metadata: b.metadata
    }));

    return {
      output: {
        brands,
        count: data?.resource?.total ?? brands.length
      },
      message: `Found **${brands.length}** brand(s).`
    };
  })
  .build();

export let updateBrand = SlateTool.create(spec, {
  name: 'Update Brand',
  key: 'update_brand',
  description: `Updates an existing Brand's name, logo, or metadata.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      brandId: z.string().describe('ID of the brand to update'),
      name: z.string().optional().describe('New name for the brand'),
      logoURL: z.string().optional().describe('New URL for the brand logo'),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Updated metadata for the brand')
    })
  )
  .output(brandSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let brand = await client.updateBrand(ctx.input.brandId, {
      name: ctx.input.name,
      logoURL: ctx.input.logoURL,
      metadata: ctx.input.metadata
    });

    return {
      output: {
        brandId: brand.id,
        name: brand.name,
        logoURL: brand.logoURL,
        live: brand.live,
        accountId: brand.accountId,
        consent: brand.consent,
        created: brand.created,
        updated: brand.updated,
        metadata: brand.metadata
      },
      message: `Brand **${brand.name}** (\`${brand.id}\`) updated successfully.`
    };
  })
  .build();

export let deleteBrand = SlateTool.create(spec, {
  name: 'Delete Brand',
  key: 'delete_brand',
  description: `Deletes a Brand from your Fidel API account. This is a destructive action that cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      brandId: z.string().describe('ID of the brand to delete')
    })
  )
  .output(
    z.object({
      brandId: z.string().describe('ID of the deleted brand'),
      deleted: z.boolean().describe('Whether the brand was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteBrand(ctx.input.brandId);

    return {
      output: {
        brandId: ctx.input.brandId,
        deleted: true
      },
      message: `Brand \`${ctx.input.brandId}\` deleted successfully.`
    };
  })
  .build();
