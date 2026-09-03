import { z } from 'zod';
import {
  DEFAULT_ITEMS_PER_PAGE,
  MAX_ITEMS_PER_PAGE,
  SAFE_DOCUMENT_MIME_EXTENSIONS
} from './constants';

export const trimmedStringSchema = z.string().trim().min(1);
export const querySchema = trimmedStringSchema.max(200);
export const companyNumberSchema = trimmedStringSchema.max(32);
export const officerIdSchema = trimmedStringSchema.max(256);
export const documentIdSchema = trimmedStringSchema.max(256);
export const transactionIdSchema = trimmedStringSchema.max(256);
export const chargeIdSchema = trimmedStringSchema.max(256);

export const itemsPerPageSchema = z
  .number()
  .int()
  .min(1)
  .max(MAX_ITEMS_PER_PAGE)
  .default(DEFAULT_ITEMS_PER_PAGE);
export const startIndexSchema = z.number().int().min(0).default(0);

export const paginationFields = {
  itemsPerPage: itemsPerPageSchema,
  startIndex: startIndexSchema
};
export const paginationSchema = z.object(paginationFields);

export const isoDateSchema = z.iso.date();

export const documentMimeTypeSchema = trimmedStringSchema.refine(
  value => value in SAFE_DOCUMENT_MIME_EXTENSIONS,
  'Choose a MIME type advertised by Companies House document metadata.'
);

export const providerRecordSchema = z.record(z.string(), z.unknown());

export const addressSchema = z
  .object({
    address_line_1: z.string().optional(),
    address_line_2: z.string().optional(),
    care_of: z.string().optional(),
    country: z.string().optional(),
    locality: z.string().optional(),
    po_box: z.string().optional(),
    postal_code: z.string().optional(),
    premises: z.string().optional(),
    region: z.string().optional()
  })
  .passthrough();

export const linksSchema = z
  .object({
    appointments: z.string().optional(),
    company_profile: z.string().optional(),
    document: z.string().optional(),
    document_metadata: z.string().optional(),
    self: z.string().optional()
  })
  .passthrough();

export const companyRecordSchema = z
  .object({
    company_name: z.string().optional(),
    company_number: z.string().optional(),
    company_status: z.string().optional(),
    company_subtype: z.string().optional(),
    company_type: z.string().optional(),
    date_of_cessation: z.string().optional(),
    date_of_creation: z.string().optional(),
    title: z.string().optional(),
    address: addressSchema.optional(),
    registered_office_address: addressSchema.optional(),
    links: linksSchema.optional()
  })
  .passthrough();

export const officerRecordSchema = z
  .object({
    name: z.string().optional(),
    title: z.string().optional(),
    officer_role: z.string().optional(),
    appointed_on: z.string().optional(),
    resigned_on: z.string().optional(),
    address: addressSchema.optional(),
    links: linksSchema.optional()
  })
  .passthrough();

export const filingRecordSchema = z
  .object({
    transaction_id: z.string().optional(),
    category: z.string().optional(),
    date: z.string().optional(),
    description: z.string().optional(),
    type: z.string().optional(),
    links: linksSchema.optional()
  })
  .passthrough();

export const chargeRecordSchema = z
  .object({
    id: z.string().optional(),
    status: z.string().optional(),
    created_on: z.string().optional(),
    delivered_on: z.string().optional(),
    satisfied_on: z.string().optional(),
    links: linksSchema.optional()
  })
  .passthrough();

export const pscRecordSchema = z
  .object({
    name: z.string().optional(),
    kind: z.string().optional(),
    notified_on: z.string().optional(),
    ceased_on: z.string().optional(),
    ceased: z.boolean().optional(),
    natures_of_control: z.array(z.string()).optional(),
    links: linksSchema.optional()
  })
  .passthrough();

export const documentMetadataSchema = z
  .object({
    id: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    pages: z.number().optional(),
    links: linksSchema.optional(),
    resources: z.record(z.string(), providerRecordSchema).optional()
  })
  .passthrough();

export const providerEnvelopeSchema = z
  .object({
    items: z.array(providerRecordSchema).optional(),
    items_per_page: z.number().optional(),
    start_index: z.number().optional(),
    total_count: z.number().optional(),
    total_results: z.number().optional()
  })
  .passthrough();

export const advancedCompanySearchEnvelopeSchema = z
  .object({
    hits: z.string(),
    items: z.array(providerRecordSchema).optional(),
    top_hit: providerRecordSchema.optional()
  })
  .passthrough();
