import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { requireHeadoutId, requireHeadoutText } from '../lib/response';
import { spec } from '../spec';

let categorySchema = z
  .object({
    categoryId: z.string().describe('Category identifier'),
    name: z.string().describe('Category name'),
    cityCode: z.string().optional().describe('City code'),
    canonicalUrl: z.string().optional().describe('Category page URL')
  })
  .passthrough();

let subcategorySchema = z
  .object({
    subCategoryId: z.string().describe('Subcategory identifier'),
    categoryId: z.string().optional().describe('Parent category ID'),
    name: z.string().describe('Subcategory name'),
    cityCode: z.string().optional().describe('City code'),
    canonicalUrl: z.string().optional().describe('Subcategory page URL')
  })
  .passthrough();

export let listCategories = SlateTool.create(spec, {
  name: 'List Categories',
  key: 'list_categories',
  description: `List categories and subcategories of experiences for a given city.
Categories (e.g., "Tickets", "Tours") and subcategories (e.g., "Landmarks", "Museums") can be used to filter product searches.`,
  instructions: [
    'Use the returned categoryId or subCategoryId values as filters in the "Search Products" tool.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cityCode: z.string().describe('City code (e.g., NEW_YORK, DUBAI)'),
      includeSubcategories: z
        .boolean()
        .optional()
        .describe('Also fetch subcategories (default: true)'),
      languageCode: z
        .string()
        .optional()
        .describe('Override default language (EN, ES, FR, IT, DE, PT, NL, PL)')
    })
  )
  .output(
    z.object({
      categories: z.array(categorySchema).describe('List of categories'),
      subcategories: z
        .array(subcategorySchema)
        .optional()
        .describe('List of subcategories (if requested)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment,
      languageCode: ctx.config.languageCode,
      currencyCode: ctx.config.currencyCode
    });

    let langParams = { languageCode: ctx.input.languageCode };

    let categoriesResult = await client.listCategories(ctx.input.cityCode, langParams);
    let categories = (categoriesResult.items ?? categoriesResult.categories ?? []).map(
      (c: any) => ({
        ...c,
        categoryId: requireHeadoutId(c?.id ?? c?.categoryId, 'category ID'),
        name: requireHeadoutText(c.name, 'category name'),
        cityCode: c.cityCode ?? ctx.input.cityCode,
        canonicalUrl: c.canonicalUrl
      })
    );

    let subcategories: any[] | undefined;
    let includeSubcategories = ctx.input.includeSubcategories !== false;

    if (includeSubcategories) {
      let subcategoriesResult = await client.listSubcategories(ctx.input.cityCode, langParams);
      subcategories = (
        subcategoriesResult.items ??
        subcategoriesResult.subCategories ??
        subcategoriesResult.subcategories ??
        []
      ).map((s: any) => ({
        ...s,
        categoryId:
          s?.categoryId != null
            ? requireHeadoutId(s.categoryId, 'parent category ID')
            : undefined,
        subCategoryId: requireHeadoutId(s?.id ?? s?.subCategoryId, 'subcategory ID'),
        name: requireHeadoutText(s.name, 'subcategory name'),
        cityCode: s.cityCode ?? ctx.input.cityCode,
        canonicalUrl: s.canonicalUrl
      }));
    }

    return {
      output: {
        categories,
        subcategories
      },
      message: `Found ${categories.length} categories${subcategories ? ` and ${subcategories.length} subcategories` : ''} in **${ctx.input.cityCode}**.`
    };
  })
  .build();
