import { z } from 'zod';

export let mailingAddressSchema = z.object({
  firstName: z.string().optional().describe('Recipient first name on the address'),
  lastName: z.string().optional().describe('Recipient last name on the address'),
  address1: z.string().describe('Street address'),
  address2: z.string().optional().describe('Apartment, suite, or second address line'),
  city: z.string().describe('City'),
  state: z.string().describe('State or province'),
  postalCode: z.string().describe('Postal code'),
  country: z
    .string()
    .describe('Two-letter country code; Goody documents US for supplied addresses')
});

export let collectionSchema = z.object({
  collectionId: z.string().describe('Collection ID'),
  workspaceId: z.string().describe('Workspace that owns the collection'),
  title: z.string().nullable().describe('Collection title'),
  isPublished: z.boolean().describe('Whether a published version exists'),
  publishedPrice: z
    .number()
    .nullable()
    .describe('Published collection price including shipping, in cents'),
  productId: z
    .string()
    .nullable()
    .describe('Sendable product ID for this collection; pass it to send_gift when published'),
  details: z
    .record(z.string(), z.unknown())
    .describe(
      'Complete collection details, including published version, categories, and selectable products'
    )
});

export let mapCollection = (collection: {
  id: string;
  workspace_id: string;
  title?: string | null;
  is_published: boolean;
  published_price?: number | null;
  product?: { id: string } | null;
  [key: string]: unknown;
}) => ({
  collectionId: collection.id,
  workspaceId: collection.workspace_id,
  title: collection.title ?? null,
  isPublished: collection.is_published,
  publishedPrice: collection.published_price ?? null,
  productId: collection.product?.id ?? null,
  details: collection
});
