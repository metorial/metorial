import { z } from 'zod';

export let paginationInputFields = {
  page: z.number().int().min(1).optional().describe('Page number, starting at 1.'),
  perPage: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Results per page, up to 100. Default: 25.')
};

export let paginationSchema = z.object({
  page: z.number().optional(),
  per_page: z.number().optional(),
  total_pages: z.number().optional(),
  total_records: z.number().optional()
});

export let modelingRequestSchema = z.object({
  id: z.string().describe('Modeling request ID.'),
  type: z.string().describe('Resource type returned by Modelry.'),
  attributes: z
    .object({
      uid: z.string().nullable().optional(),
      sku: z.string().nullable().optional(),
      title: z.string().nullable().optional(),
      createdAt: z.string().nullable().optional(),
      batchUID: z.string().nullable().optional(),
      batchUid: z.string().nullable().optional(),
      deliveredAt: z.string().nullable().optional(),
      status: z.string().nullable().optional(),
      pipeline: z.string().nullable().optional(),
      price: z.string().nullable().optional(),
      previewImageUrl: z.string().nullable().optional(),
      dimensions: z.string().nullable().optional(),
      productUrl: z.string().nullable().optional(),
      productId: z.number().nullable().optional(),
      requestType: z.string().nullable().optional(),
      inCustomerQa: z.boolean().nullable().optional(),
      customerQaUrl: z.string().nullable().optional(),
      referenceFileUrls: z.array(z.string()).nullable().optional(),
      currentRoundNumber: z.number().nullable().optional(),
      currentRoundSaved: z.boolean().nullable().optional(),
      reviewCategories: z
        .array(z.object({ id: z.string(), title: z.string() }))
        .nullable()
        .optional()
    })
    .passthrough()
});
