import { z } from 'zod';

export let customerSchema = z.object({
  customerId: z.string().describe('Unique customer ID'),
  customerName: z.string().nullable().optional().describe('Full name'),
  email: z.string().nullable().optional().describe('Email address'),
  phoneNumber: z.string().nullable().optional().describe('Phone number'),
  address: z.string().nullable().optional().describe('Street address'),
  city: z.string().nullable().optional().describe('City'),
  region: z.string().nullable().optional().describe('State/region'),
  postalCode: z.string().nullable().optional().describe('Postal/ZIP code'),
  countryCode: z.string().nullable().optional().describe('Country code'),
  customerCode: z.string().nullable().optional().describe('Customer loyalty code'),
  note: z.string().nullable().optional().describe('Customer note'),
  firstVisit: z.string().nullable().optional().describe('First visit timestamp'),
  lastVisit: z.string().nullable().optional().describe('Most recent visit timestamp'),
  totalVisits: z.number().nullable().optional().describe('Total number of visits'),
  totalMoneySpent: z.number().nullable().optional().describe('Total money spent'),
  totalPoints: z.number().nullable().optional().describe('Loyalty points balance'),
  permanentDeletionAt: z
    .string()
    .nullable()
    .optional()
    .describe('Scheduled permanent deletion timestamp'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp'),
  deletedAt: z.string().nullable().optional().describe('Deletion timestamp')
});

export let mapCustomer = (c: any): z.infer<typeof customerSchema> => ({
  customerId: c.id,
  customerName: c.name,
  email: c.email,
  phoneNumber: c.phone_number,
  address: c.address,
  city: c.city,
  region: c.region,
  postalCode: c.postal_code,
  countryCode: c.country_code,
  customerCode: c.customer_code,
  note: c.note,
  firstVisit: c.first_visit,
  lastVisit: c.last_visit,
  totalVisits: c.total_visits,
  totalMoneySpent: c.total_spent ?? c.total_money_spent,
  totalPoints: c.total_points,
  permanentDeletionAt: c.permanent_deletion_at,
  createdAt: c.created_at,
  updatedAt: c.updated_at,
  deletedAt: c.deleted_at
});

let digitsOnly = (value: string) => value.replace(/\D/g, '');

export let phoneMatches = (candidate: string | null | undefined, query: string) => {
  if (!candidate) return false;
  let a = digitsOnly(candidate);
  let b = digitsOnly(query);
  if (!a || !b) return candidate.trim() === query.trim();
  if (a === b) return true;
  // Tolerate a missing country code / trunk prefix on either side.
  let [shorter, longer] = a.length < b.length ? [a, b] : [b, a];
  return shorter.length >= 7 && longer.endsWith(shorter);
};
