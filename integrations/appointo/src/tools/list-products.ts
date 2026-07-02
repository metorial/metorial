import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let appointmentSchema = z
  .object({
    appointmentId: z.number().optional().describe('Appointment ID'),
    name: z.string().optional().describe('Appointment name'),
    price: z.string().optional().describe('Price of the appointment'),
    currency: z.string().optional().describe('Currency code')
  })
  .passthrough();

let productSchema = z
  .object({
    productId: z.number().optional().describe('Internal product ID'),
    productUuid: z.string().optional().describe('Product UUID'),
    productName: z.string().optional().describe('Name of the product'),
    activate: z.boolean().optional().describe('Whether the product is active'),
    appointmentType: z.string().optional().describe('Type of appointment'),
    vendorName: z.string().optional().describe('Vendor name'),
    includeVariantBooking: z
      .boolean()
      .optional()
      .describe('Whether variant booking is included'),
    bookWithoutPay: z
      .boolean()
      .optional()
      .describe('Whether booking without payment is allowed'),
    imageUrl: z.string().optional().describe('URL of the product image'),
    variantsCount: z.number().optional().describe('Number of variants'),
    appointments: z
      .array(appointmentSchema)
      .optional()
      .describe('Appointments associated with this product')
  })
  .passthrough();

export let listProducts = SlateTool.create(spec, {
  name: 'List Products',
  key: 'list_products',
  description: `Retrieve bookable products (services) configured in Appointo. Products represent the bookable services or items offered by the business. Use search to filter products by name. Supports pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of products to return (max 100, default 100)'),
      offset: z.number().optional().describe('Pagination offset'),
      searchTerm: z.string().optional().describe('Filter products by name')
    })
  )
  .output(
    z.object({
      products: z.array(productSchema).describe('List of products')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listProducts({
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      searchTerm: ctx.input.searchTerm
    });

    let products = Array.isArray(result) ? result : (result?.products ?? result?.data ?? []);

    let mapped = products.map((p: any) => ({
      productId: p.id,
      productUuid: p.product_uuid,
      productName: p.product_name,
      activate: p.activate,
      appointmentType: p.appointment_type,
      vendorName: p.vendor_name,
      includeVariantBooking: p.include_variant_booking,
      bookWithoutPay: p.book_without_pay,
      imageUrl: p.image_url,
      variantsCount: p.variants_count,
      appointments: p.appointments?.map((a: any) => ({
        appointmentId: a.id,
        name: a.name,
        price: a.price,
        currency: a.currency,
        ...a
      })),
      ...p
    }));

    return {
      output: { products: mapped },
      message: `Retrieved **${mapped.length}** product(s).`
    };
  })
  .build();
