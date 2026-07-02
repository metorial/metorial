import { SlateTool } from 'slates';
import { z } from 'zod';
import { MetaAdsClient } from '../lib/client';
import { metaAdsServiceError } from '../lib/errors';
import { spec } from '../spec';

let businessSchema = z.object({
  businessId: z.string().describe('Meta Business ID'),
  name: z.string().optional().describe('Business name'),
  createdTime: z.string().optional().describe('Creation timestamp'),
  verificationStatus: z.string().optional().describe('Business verification status')
});

let adAccountSchema = z.object({
  adAccountId: z.string().describe('Ad account ID, usually prefixed with act_'),
  accountId: z.string().optional().describe('Numeric ad account ID'),
  name: z.string().optional().describe('Ad account name'),
  accountStatus: z.number().optional().describe('Meta account status code'),
  currency: z.string().optional().describe('Account currency'),
  timezoneName: z.string().optional().describe('Account time zone'),
  business: z.any().optional().describe('Owning business summary')
});

let pageSchema = z.object({
  pageId: z.string().describe('Facebook Page ID'),
  name: z.string().optional().describe('Page name'),
  category: z.string().optional().describe('Page category'),
  tasks: z.array(z.string()).optional().describe('Tasks granted for the authenticated user'),
  instagramBusinessAccount: z.any().optional().describe('Connected Instagram business account')
});

let catalogSchema = z.object({
  catalogId: z.string().describe('Product catalog ID'),
  name: z.string().optional().describe('Catalog name'),
  productCount: z.number().optional().describe('Number of products in the catalog'),
  vertical: z.string().optional().describe('Catalog vertical'),
  isCatalogSegment: z.boolean().optional().describe('Whether the catalog is a segment')
});

let catalogProductSchema = z.object({
  productId: z.string().describe('Catalog product ID'),
  name: z.string().optional().describe('Product name'),
  description: z.string().optional().describe('Product description'),
  price: z.string().optional().describe('Product price'),
  currency: z.string().optional().describe('Product currency'),
  availability: z.string().optional().describe('Product availability'),
  imageUrl: z.string().optional().describe('Product image URL'),
  url: z.string().optional().describe('Product URL'),
  retailerId: z.string().optional().describe('Retailer product ID')
});

let createClient = (ctx: {
  auth: { token: string };
  config: { adAccountId: string; apiVersion: string };
}) =>
  new MetaAdsClient({
    token: ctx.auth.token,
    adAccountId: ctx.config.adAccountId,
    apiVersion: ctx.config.apiVersion
  });

export let listBusinesses = SlateTool.create(spec, {
  name: 'List Businesses',
  key: 'list_businesses',
  description:
    'List Meta Business accounts available to the authenticated user. Use this to find the businessId needed for product catalog tools.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Max number of businesses to return (default 25)'),
      afterCursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      businesses: z.array(businessSchema),
      nextCursor: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let result = await createClient(ctx).getBusinesses({
      limit: ctx.input.limit,
      after: ctx.input.afterCursor
    });

    let businesses = (result.data || []).map((business: any) => ({
      businessId: business.id,
      name: business.name,
      createdTime: business.created_time,
      verificationStatus: business.verification_status
    }));

    return {
      output: {
        businesses,
        nextCursor: result.paging?.cursors?.after
      },
      message: `Retrieved **${businesses.length}** businesses.`
    };
  })
  .build();

export let listAdAccounts = SlateTool.create(spec, {
  name: 'List Ad Accounts',
  key: 'list_ad_accounts',
  description:
    'List ad accounts visible to the authenticated user. Use this to discover adAccountId values for integration configuration.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .describe('Max number of ad accounts to return (default 25)'),
      afterCursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      adAccounts: z.array(adAccountSchema),
      nextCursor: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let result = await createClient(ctx).getAdAccounts({
      limit: ctx.input.limit,
      after: ctx.input.afterCursor
    });

    let adAccounts = (result.data || []).map((account: any) => ({
      adAccountId: account.id,
      accountId: account.account_id,
      name: account.name,
      accountStatus: account.account_status,
      currency: account.currency,
      timezoneName: account.timezone_name,
      business: account.business
    }));

    return {
      output: {
        adAccounts,
        nextCursor: result.paging?.cursors?.after
      },
      message: `Retrieved **${adAccounts.length}** ad accounts.`
    };
  })
  .build();

export let listPages = SlateTool.create(spec, {
  name: 'List Pages',
  key: 'list_pages',
  description:
    'List Facebook Pages available to the authenticated user. Use this to find page IDs for lead forms and ad creative object story specs.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Max number of pages to return (default 25)'),
      afterCursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      pages: z.array(pageSchema),
      nextCursor: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let result = await createClient(ctx).getPages({
      limit: ctx.input.limit,
      after: ctx.input.afterCursor
    });

    let pages = (result.data || []).map((page: any) => ({
      pageId: page.id,
      name: page.name,
      category: page.category,
      tasks: page.tasks,
      instagramBusinessAccount: page.instagram_business_account
    }));

    return {
      output: {
        pages,
        nextCursor: result.paging?.cursors?.after
      },
      message: `Retrieved **${pages.length}** pages.`
    };
  })
  .build();

export let listProductCatalogs = SlateTool.create(spec, {
  name: 'List Product Catalogs',
  key: 'list_product_catalogs',
  description:
    'List product catalogs owned by a Meta Business. Product catalogs power Advantage+ catalog ads and dynamic product ads.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      businessId: z
        .string()
        .optional()
        .describe('Meta Business ID. If omitted, uses the optional businessId config value.'),
      limit: z.number().optional().describe('Max number of catalogs to return (default 25)'),
      afterCursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      catalogs: z.array(catalogSchema),
      nextCursor: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let businessId = ctx.input.businessId ?? ctx.config.businessId;
    if (!businessId) {
      throw metaAdsServiceError(
        'businessId is required. Pass it to the tool or set the optional integration businessId config.'
      );
    }

    let result = await createClient(ctx).getCatalogs(businessId, {
      limit: ctx.input.limit,
      after: ctx.input.afterCursor
    });

    let catalogs = (result.data || []).map((catalog: any) => ({
      catalogId: catalog.id,
      name: catalog.name,
      productCount: catalog.product_count,
      vertical: catalog.vertical,
      isCatalogSegment: catalog.is_catalog_segment
    }));

    return {
      output: {
        catalogs,
        nextCursor: result.paging?.cursors?.after
      },
      message: `Retrieved **${catalogs.length}** product catalogs.`
    };
  })
  .build();

export let listCatalogProducts = SlateTool.create(spec, {
  name: 'List Catalog Products',
  key: 'list_catalog_products',
  description:
    'List products in a Meta product catalog, with optional catalog API filter support.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      catalogId: z.string().describe('Product catalog ID'),
      filter: z
        .record(z.string(), z.any())
        .optional()
        .describe('Optional Meta catalog products filter object'),
      limit: z.number().optional().describe('Max number of products to return (default 25)'),
      afterCursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      products: z.array(catalogProductSchema),
      nextCursor: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let result = await createClient(ctx).getCatalogProducts(ctx.input.catalogId, {
      filter: ctx.input.filter,
      limit: ctx.input.limit,
      after: ctx.input.afterCursor
    });

    let products = (result.data || []).map((product: any) => ({
      productId: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      currency: product.currency,
      availability: product.availability,
      imageUrl: product.image_url,
      url: product.url,
      retailerId: product.retailer_id
    }));

    return {
      output: {
        products,
        nextCursor: result.paging?.cursors?.after
      },
      message: `Retrieved **${products.length}** catalog products.`
    };
  })
  .build();
