import { customFieldSchema } from '@slates/google-people-recipes';
import { z } from 'zod';

export {
  addressSchema,
  biographySchema,
  birthdaySchema,
  contactInputSchema,
  contactOutputSchema,
  customFieldSchema,
  dateFieldSchema,
  emailSchema,
  eventSchema,
  formatContact,
  membershipSchema,
  nameSchema,
  nicknameSchema,
  occupationSchema,
  organizationSchema,
  phoneSchema,
  relationSchema,
  urlSchema
} from '@slates/google-people-recipes';

export let contactGroupSchema = z.object({
  resourceName: z.string().describe('Unique resource name (e.g., contactGroups/abc123)'),
  etag: z
    .string()
    .optional()
    .describe('ETag/fingerprint for concurrency control, required when updating'),
  name: z.string().optional().describe('Display name of the group'),
  formattedName: z.string().optional().describe('Formatted name of the group'),
  groupType: z
    .string()
    .optional()
    .describe('GROUP_TYPE_UNSPECIFIED, USER_CONTACT_GROUP, or SYSTEM_CONTACT_GROUP'),
  memberCount: z.number().optional().describe('Number of members in the group'),
  memberResourceNames: z
    .array(z.string())
    .optional()
    .describe('Resource names of group members'),
  clientData: z.array(customFieldSchema).optional().describe('Client-specific key-value data')
});

export let formatContactGroup = (group: any) => {
  return {
    resourceName: group.resourceName,
    etag: group.etag,
    name: group.name,
    formattedName: group.formattedName,
    groupType: group.groupType,
    memberCount: group.memberCount,
    memberResourceNames: group.memberResourceNames,
    clientData: group.clientData
  };
};
