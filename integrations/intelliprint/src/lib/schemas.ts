import { z } from 'zod';

// ─── Shared Schemas ─────────────────────────────────────────────

export let addressSchema = z.object({
  name: z.string().optional().describe('Recipient name'),
  line: z
    .string()
    .describe('Address lines (full address excluding name, postcode, and country)'),
  postcode: z.string().optional().describe('Postcode / ZIP code'),
  country: z
    .string()
    .optional()
    .describe('2-character ISO 3166-1 alpha-2 country code (defaults to GB)')
});

export let recipientSchema = z.object({
  address: addressSchema.describe('Recipient address'),
  variables: z
    .record(z.string(), z.any())
    .optional()
    .describe('Template variable values for this recipient')
});

export let costSchema = z.object({
  amount: z.number().describe('Cost amount in smallest units (divide by 10^8 for GBP)'),
  tax: z.number().describe('Tax amount'),
  afterTax: z.number().describe('Total after tax'),
  currency: z.string().describe('Currency code (e.g. GBP)')
});

export let postageServiceEnum = z.enum([
  'uk_second_class',
  'uk_first_class',
  'uk_second_class_signed_for',
  'uk_first_class_signed_for',
  'uk_special_delivery_9am',
  'uk_special_delivery',
  'international',
  'tracked_24',
  'tracked_48'
]);

export let envelopeEnum = z.enum([
  'c5',
  'c4',
  'c4_plus',
  'a4_box',
  'postcard_a6',
  'postcard_a5',
  'postcard_a5_enveloped'
]);

export let letterStatusEnum = z.enum([
  'draft',
  'waiting_to_print',
  'printing',
  'enclosing',
  'shipping',
  'sent',
  'cancelled',
  'returned',
  'failed_wrong_address'
]);

export let letterSchema = z.object({
  letterId: z.string().describe('Unique letter ID'),
  status: letterStatusEnum.describe('Current letter status'),
  pages: z.number().optional().describe('Number of pages'),
  sheets: z.number().optional().describe('Number of physical sheets'),
  postageService: postageServiceEnum.optional().describe('Postage service used'),
  envelope: envelopeEnum.optional().describe('Envelope or postcard size'),
  trackingNumber: z.string().nullable().optional().describe('Royal Mail tracking number'),
  shippedDate: z.number().nullable().optional().describe('UNIX timestamp when shipped'),
  address: addressSchema.optional().describe('Recipient address'),
  returned: z
    .object({
      acknowledged: z.boolean().optional(),
      date: z.number().optional().describe('UNIX timestamp of return'),
      reason: z.string().optional().describe('Reason for return')
    })
    .nullable()
    .optional()
    .describe('Return information if letter was returned'),
  cost: costSchema.optional().describe('Letter cost breakdown'),
  pdf: z.string().nullable().optional().describe('Signed PDF preview URL (expires in 1 hour)')
});

export let splittingSchema = z.object({
  method: z
    .enum(['none', 'split_on_phrase', 'split_on_pages', 'mailing_list'])
    .optional()
    .describe('Splitting method'),
  phrase: z.string().optional().describe('Phrase to split on (for split_on_phrase method)'),
  pages: z
    .number()
    .optional()
    .describe('Number of pages per split (for split_on_pages method)')
});

export let printingSchema = z.object({
  doubleSided: z
    .enum(['no', 'yes', 'mixed'])
    .optional()
    .describe('Double-sided printing option'),
  premiumQuality: z.boolean().optional().describe('Premium quality printing'),
  blackAndWhite: z.boolean().optional().describe('Black and white printing (letters only)'),
  mattFinish: z.boolean().optional().describe('Matt finish (postcards only)')
});

export let postageSchema = z.object({
  service: postageServiceEnum.optional().describe('Postage service to use'),
  idealEnvelope: z
    .enum([
      'c5',
      'c4',
      'c4_plus',
      'a4_box',
      'postcard_a6',
      'postcard_a5',
      'postcard_a5_enveloped'
    ])
    .optional()
    .describe('Preferred envelope/postcard size'),
  mailDate: z.number().optional().describe('UNIX timestamp for scheduled send date')
});

export let backgroundRefSchema = z.object({
  firstPage: z.string().optional().describe('Background ID for the first page'),
  otherPages: z.string().optional().describe('Background ID for subsequent pages')
});

export let nudgeSchema = z.object({
  x: z
    .number()
    .optional()
    .describe('Horizontal offset in mm (positive = right, negative = left)'),
  y: z.number().optional().describe('Vertical offset in mm (positive = down, negative = up)')
});

export let extraDocumentSchema = z.object({
  name: z.string().optional().describe('Name of the extra document'),
  order: z.enum(['first', 'last', 'custom']).optional().describe('Document ordering'),
  applyBackground: z
    .boolean()
    .optional()
    .describe('Whether to apply background to this document'),
  pages: z.number().optional().describe('Number of pages in the document')
});

export let printJobSchema = z.object({
  printJobId: z.string().describe('Print job ID'),
  testmode: z.boolean().optional().describe('Whether this is a test print job'),
  reference: z.string().optional().nullable().describe('User-provided reference'),
  confirmed: z
    .boolean()
    .optional()
    .describe('Whether the print job is confirmed for printing'),
  type: z.enum(['letter', 'postcard']).optional().describe('Mail type'),
  pages: z.number().optional().describe('Total pages'),
  sheets: z.number().optional().describe('Total sheets'),
  confidential: z.boolean().optional().describe('Whether the print job is confidential'),
  letters: z
    .array(letterSchema)
    .optional()
    .describe('Individual mail items in this print job'),
  cost: costSchema.optional().nullable().describe('Total cost breakdown'),
  template: z.string().optional().nullable().describe('Template ID used'),
  mailingList: z.string().optional().nullable().describe('Mailing list ID used'),
  addressWindow: z
    .enum(['left', 'right'])
    .optional()
    .nullable()
    .describe('Address window position'),
  confirmedAt: z.number().optional().nullable().describe('UNIX timestamp when confirmed'),
  created: z.number().optional().describe('UNIX timestamp when created'),
  metadata: z.record(z.string(), z.any()).optional().nullable().describe('Custom metadata')
});

export let backgroundSchema = z.object({
  backgroundId: z.string().describe('Background ID'),
  name: z.string().optional().describe('Background name'),
  file: z
    .object({
      name: z.string().optional(),
      size: z.number().optional()
    })
    .optional()
    .describe('File information'),
  pdf: z.string().nullable().optional().describe('Signed PDF preview URL'),
  created: z.number().optional().describe('UNIX timestamp when created')
});

export let mailingListSchema = z.object({
  mailingListId: z.string().describe('Mailing list ID'),
  name: z.string().describe('Mailing list name'),
  recipients: z.number().optional().describe('Number of recipients'),
  variables: z
    .array(z.object({ name: z.string() }))
    .optional()
    .describe('Template variables available'),
  longestAddressLine: z
    .string()
    .optional()
    .describe('Longest address line for layout validation'),
  addressValidation: z
    .object({
      requested: z.boolean().optional(),
      completed: z.boolean().optional(),
      recipients: z
        .object({
          passed: z.number().optional(),
          failed: z.number().optional()
        })
        .optional()
    })
    .optional()
    .describe('Address validation status'),
  created: z.number().optional().describe('UNIX timestamp when created')
});

export let mailingListRecipientSchema = z.object({
  recipientId: z.string().describe('Recipient ID'),
  mailingListId: z.string().describe('Parent mailing list ID'),
  address: addressSchema.describe('Recipient address'),
  variables: z.record(z.string(), z.any()).optional().describe('Template variable values'),
  addressValidationStatus: z
    .enum(['passed', 'failed', 'pending', 'not_requested'])
    .optional()
    .describe('Address validation status'),
  created: z.number().optional().describe('UNIX timestamp when created')
});

// ─── Response mappers ───────────────────────────────────────────

export let mapLetter = (letter: any) => ({
  letterId: letter.id,
  status: letter.status,
  pages: letter.pages,
  sheets: letter.sheets,
  postageService: letter.postage_service,
  envelope: letter.envelope,
  trackingNumber: letter.tracking_number ?? null,
  shippedDate: letter.shipped_date ?? null,
  address: letter.address,
  returned: letter.returned ?? null,
  cost: letter.cost
    ? {
        amount: letter.cost.amount,
        tax: letter.cost.tax,
        afterTax: letter.cost.after_tax,
        currency: letter.cost.currency
      }
    : undefined,
  pdf: letter.pdf ?? null
});

export let mapPrintJob = (job: any) => ({
  printJobId: job.id,
  testmode: job.testmode,
  reference: job.reference ?? null,
  confirmed: job.confirmed,
  type: job.type,
  pages: job.pages,
  sheets: job.sheets,
  confidential: job.confidential,
  letters: job.letters?.map(mapLetter) ?? [],
  cost: job.cost
    ? {
        amount: job.cost.amount,
        tax: job.cost.tax,
        afterTax: job.cost.after_tax,
        currency: job.cost.currency
      }
    : null,
  template: job.template ?? null,
  mailingList: job.mailing_list ?? null,
  addressWindow: job.address_window ?? null,
  confirmedAt: job.confirmed_at ?? null,
  created: job.created,
  metadata: job.metadata ?? null
});

export let mapBackground = (bg: any) => ({
  backgroundId: bg.id,
  name: bg.name,
  file: bg.file,
  pdf: bg.pdf ?? null,
  created: bg.created
});

export let mapMailingList = (ml: any) => ({
  mailingListId: ml.id,
  name: ml.name,
  recipients: ml.recipients,
  variables: ml.variables,
  longestAddressLine: ml.longest_address_line,
  addressValidation: ml.address_validation
    ? {
        requested: ml.address_validation.requested,
        completed: ml.address_validation.completed,
        recipients: ml.address_validation.recipients
      }
    : undefined,
  created: ml.created
});

export let mapRecipient = (r: any) => ({
  recipientId: r.id,
  mailingListId: r.mailing_list,
  address: r.address,
  variables: r.variables,
  addressValidationStatus: r.address_validation_status,
  created: r.created
});
