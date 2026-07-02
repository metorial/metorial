import { SlateTool } from 'slates';
import { z } from 'zod';
import { woocommerceServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let productAttributeSchema = z.object({
  attributeId: z.number(),
  name: z.string(),
  slug: z.string(),
  type: z.string(),
  orderBy: z.string(),
  hasArchives: z.boolean()
});

let productAttributeTermSchema = z.object({
  termId: z.number(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  count: z.number(),
  menuOrder: z.number()
});

export let manageProductAttributes = SlateTool.create(spec, {
  name: 'Manage Product Attributes',
  key: 'manage_product_attributes',
  description: `List, get, create, update, or delete global product attributes and their terms. Use these for reusable product facets and variable product options.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'list_attributes',
          'get_attribute',
          'create_attribute',
          'update_attribute',
          'delete_attribute',
          'list_terms',
          'get_term',
          'create_term',
          'update_term',
          'delete_term'
        ])
        .describe('Operation to perform'),
      attributeId: z
        .number()
        .optional()
        .describe('Attribute ID (required for attribute-specific and term actions)'),
      termId: z.number().optional().describe('Term ID (required for get/update/delete term)'),
      page: z.number().optional().default(1).describe('Page number for term list'),
      perPage: z.number().optional().default(10).describe('Results per page for term list'),
      search: z.string().optional().describe('Search term for term list'),
      slug: z.string().optional().describe('Attribute or term slug'),
      name: z.string().optional().describe('Attribute or term name (required for create)'),
      type: z.string().optional().describe('Attribute type, usually "select"'),
      orderBy: z
        .enum(['menu_order', 'name', 'name_num', 'id'])
        .optional()
        .describe('Attribute default sort order'),
      hasArchives: z.boolean().optional().describe('Enable archives for this attribute'),
      description: z.string().optional().describe('Term description'),
      menuOrder: z.number().optional().describe('Term menu order'),
      hideEmpty: z
        .boolean()
        .optional()
        .describe('Whether to hide terms not assigned to products'),
      force: z.boolean().optional().default(true).describe('Force permanent deletion')
    })
  )
  .output(
    z.object({
      attributes: z.array(productAttributeSchema).optional(),
      attribute: productAttributeSchema.optional(),
      terms: z.array(productAttributeTermSchema).optional(),
      term: productAttributeTermSchema.optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { action } = ctx.input;

    if (action === 'list_attributes') {
      let attributes = await client.listProductAttributes();
      let mapped = (Array.isArray(attributes) ? attributes : []).map((attribute: any) =>
        mapProductAttribute(attribute)
      );
      return {
        output: { attributes: mapped },
        message: `Found **${mapped.length}** product attributes.`
      };
    }

    if (action === 'get_attribute') {
      let attributeId = requireAttributeId(ctx.input.attributeId, action);
      let attribute = await client.getProductAttribute(attributeId);
      return {
        output: { attribute: mapProductAttribute(attribute) },
        message: `Retrieved product attribute **"${attribute.name}"** (ID: ${attribute.id}).`
      };
    }

    if (action === 'create_attribute') {
      if (!ctx.input.name)
        throw woocommerceServiceError('name is required for create_attribute');
      let data = buildAttributeData(ctx.input);
      data.name = ctx.input.name;
      let attribute = await client.createProductAttribute(data);
      return {
        output: { attribute: mapProductAttribute(attribute) },
        message: `Created product attribute **"${attribute.name}"** (ID: ${attribute.id}).`
      };
    }

    if (action === 'update_attribute') {
      let attributeId = requireAttributeId(ctx.input.attributeId, action);
      let attribute = await client.updateProductAttribute(
        attributeId,
        buildAttributeData(ctx.input)
      );
      return {
        output: { attribute: mapProductAttribute(attribute) },
        message: `Updated product attribute **"${attribute.name}"** (ID: ${attribute.id}).`
      };
    }

    if (action === 'delete_attribute') {
      let attributeId = requireAttributeId(ctx.input.attributeId, action);
      await client.deleteProductAttribute(attributeId, ctx.input.force);
      return {
        output: { deleted: true },
        message: `Deleted product attribute (ID: ${attributeId}).`
      };
    }

    if (action === 'list_terms') {
      let attributeId = requireAttributeId(ctx.input.attributeId, action);
      let params: Record<string, any> = {
        page: ctx.input.page,
        per_page: ctx.input.perPage
      };
      if (ctx.input.search) params.search = ctx.input.search;
      if (ctx.input.slug) params.slug = ctx.input.slug;
      if (ctx.input.hideEmpty !== undefined) params.hide_empty = ctx.input.hideEmpty;

      let terms = await client.listProductAttributeTerms(attributeId, params);
      let mapped = (Array.isArray(terms) ? terms : []).map((term: any) =>
        mapProductAttributeTerm(term)
      );
      return {
        output: { terms: mapped },
        message: `Found **${mapped.length}** terms for attribute ${attributeId}.`
      };
    }

    if (action === 'get_term') {
      let attributeId = requireAttributeId(ctx.input.attributeId, action);
      let termId = requireTermId(ctx.input.termId, action);
      let term = await client.getProductAttributeTerm(attributeId, termId);
      return {
        output: { term: mapProductAttributeTerm(term) },
        message: `Retrieved product attribute term **"${term.name}"** (ID: ${term.id}).`
      };
    }

    if (action === 'create_term') {
      let attributeId = requireAttributeId(ctx.input.attributeId, action);
      if (!ctx.input.name) throw woocommerceServiceError('name is required for create_term');
      let data = buildTermData(ctx.input);
      data.name = ctx.input.name;
      let term = await client.createProductAttributeTerm(attributeId, data);
      return {
        output: { term: mapProductAttributeTerm(term) },
        message: `Created product attribute term **"${term.name}"** (ID: ${term.id}).`
      };
    }

    if (action === 'update_term') {
      let attributeId = requireAttributeId(ctx.input.attributeId, action);
      let termId = requireTermId(ctx.input.termId, action);
      let term = await client.updateProductAttributeTerm(
        attributeId,
        termId,
        buildTermData(ctx.input)
      );
      return {
        output: { term: mapProductAttributeTerm(term) },
        message: `Updated product attribute term **"${term.name}"** (ID: ${term.id}).`
      };
    }

    if (action === 'delete_term') {
      let attributeId = requireAttributeId(ctx.input.attributeId, action);
      let termId = requireTermId(ctx.input.termId, action);
      await client.deleteProductAttributeTerm(attributeId, termId, ctx.input.force);
      return {
        output: { deleted: true },
        message: `Deleted product attribute term (ID: ${termId}).`
      };
    }

    throw woocommerceServiceError(`Unknown action: ${action}`);
  })
  .build();

let requireAttributeId = (attributeId: number | undefined, action: string) => {
  if (!attributeId) {
    throw woocommerceServiceError(`attributeId is required for ${action}`);
  }

  return attributeId;
};

let requireTermId = (termId: number | undefined, action: string) => {
  if (!termId) {
    throw woocommerceServiceError(`termId is required for ${action}`);
  }

  return termId;
};

let buildAttributeData = (input: any) => {
  let data: Record<string, any> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.slug !== undefined) data.slug = input.slug;
  if (input.type !== undefined) data.type = input.type;
  if (input.orderBy !== undefined) data.order_by = input.orderBy;
  if (input.hasArchives !== undefined) data.has_archives = input.hasArchives;
  return data;
};

let buildTermData = (input: any) => {
  let data: Record<string, any> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.slug !== undefined) data.slug = input.slug;
  if (input.description !== undefined) data.description = input.description;
  if (input.menuOrder !== undefined) data.menu_order = input.menuOrder;
  return data;
};

let mapProductAttribute = (attribute: any) => ({
  attributeId: attribute.id,
  name: attribute.name || '',
  slug: attribute.slug || '',
  type: attribute.type || '',
  orderBy: attribute.order_by || '',
  hasArchives: attribute.has_archives || false
});

let mapProductAttributeTerm = (term: any) => ({
  termId: term.id,
  name: term.name || '',
  slug: term.slug || '',
  description: term.description || '',
  count: term.count || 0,
  menuOrder: term.menu_order || 0
});
