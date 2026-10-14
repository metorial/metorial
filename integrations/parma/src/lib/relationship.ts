import { z } from 'zod';
import type { ParmaRelationship } from './client';

export let relationshipSchema = z.object({
  relationshipId: z.string().describe('Unique ID of the relationship'),
  name: z.string().describe('Name of the person or company'),
  email: z.string().optional().describe('Email address'),
  phone: z.string().optional().describe('Phone number'),
  company: z.string().optional().describe('Company or organization'),
  title: z.string().optional().describe('Job title or role'),
  type: z.string().optional().describe('Relationship type'),
  about: z.string().optional().describe('Background information about the relationship'),
  companyId: z.string().optional().describe('ID of the linked company relationship'),
  groupIds: z
    .array(z.string())
    .optional()
    .describe('IDs of the groups containing the relationship'),
  createdAt: z.string().optional().describe('Timestamp when the relationship was created'),
  updatedAt: z.string().optional().describe('Timestamp when the relationship was last updated')
});

export let mapRelationship = (relationship: ParmaRelationship) => ({
  relationshipId: String(relationship.id),
  name: relationship.name,
  email:
    relationship.email ??
    relationship.contact_details?.find(detail => detail.type === 'email')?.value,
  phone:
    relationship.phone ??
    relationship.contact_details?.find(detail => detail.type === 'phone')?.value,
  company: relationship.company ?? undefined,
  title: relationship.title ?? undefined,
  type: relationship.type,
  about: relationship.about,
  companyId: relationship.company_id == null ? undefined : String(relationship.company_id),
  groupIds: relationship.group_ids?.map(String),
  createdAt: relationship.created_at,
  updatedAt: relationship.updated_at
});
