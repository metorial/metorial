import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import { productOutputSchema } from './manage-product';

export let getFormField = SlateTool.create(spec, {
  name: 'Get Form Field',
  key: 'get_form_field',
  description:
    'Retrieve a field on a Paperform form, including its type-specific configuration. Call list_form_fields to discover field keys.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      formSlugOrId: z.string().describe('The form slug, custom slug, or unique ID'),
      fieldKey: z.string().describe('Field key from list_form_fields')
    })
  )
  .output(
    z.object({
      fieldKey: z.string().describe('Unique field key'),
      title: z.string().nullable().describe('Field title'),
      type: z.string().describe('Field type'),
      required: z.boolean().nullable().describe('Whether the field is required'),
      configuration: z.record(z.string(), z.unknown()).describe('Complete field configuration')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let field = await client.getFormField(ctx.input.formSlugOrId, ctx.input.fieldKey);
    return {
      output: {
        fieldKey: field.key,
        title: field.title ?? null,
        type: field.type,
        required: field.required ?? null,
        configuration: field
      },
      message: `Retrieved field **${field.title ?? field.key}**.`
    };
  })
  .build();

export let getPartialSubmission = SlateTool.create(spec, {
  name: 'Get Partial Submission',
  key: 'get_partial_submission',
  description:
    'Retrieve the answers and timestamps for a specific incomplete submission. Call list_partial_submissions to discover its ID.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      submissionId: z.string().describe('Partial submission ID from list_partial_submissions')
    })
  )
  .output(
    z.object({
      submissionId: z.string().describe('Partial submission ID'),
      formId: z.string().describe('Associated form ID'),
      formData: z.record(z.string(), z.unknown()).describe('Partial form answers'),
      createdAt: z.string().describe('Creation timestamp in UTC'),
      updatedAt: z.string().describe('Last update timestamp in UTC')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let submission = await client.getPartialSubmission(ctx.input.submissionId);
    return {
      output: {
        submissionId: submission.id,
        formId: submission.form_id,
        formData: submission.data,
        createdAt: submission.created_at_utc,
        updatedAt: submission.updated_at_utc
      },
      message: `Retrieved partial submission **${submission.id}**.`
    };
  })
  .build();

export let getProduct = SlateTool.create(spec, {
  name: 'Get Product',
  key: 'get_product',
  description:
    'Retrieve a Paperform product by SKU without listing every product on the form. Call list_products to discover SKUs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      formSlugOrId: z.string().describe('The form slug, custom slug, or unique ID'),
      sku: z.string().describe('Product SKU from list_products')
    })
  )
  .output(productOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let product = await client.getProduct(ctx.input.formSlugOrId, ctx.input.sku);
    return {
      output: {
        sku: product.SKU,
        name: product.name ?? null,
        price: product.price ?? null,
        quantity: product.quantity ?? null,
        minimum: product.minimum ?? null,
        maximum: product.maximum ?? null,
        discountable: product.discountable ?? null,
        images: product.images ?? []
      },
      message: `Retrieved product **${product.SKU}**.`
    };
  })
  .build();
