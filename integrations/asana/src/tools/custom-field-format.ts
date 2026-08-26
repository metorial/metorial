import { z } from 'zod';

let enumOptionOutputSchema = z.object({
  enumOptionId: z.string(),
  gid: z.string(),
  resourceType: z.string().optional(),
  resource_type: z.string().optional(),
  name: z.string().optional(),
  color: z.string().nullable().optional(),
  enabled: z.boolean().optional()
});

let customFieldOutputSchema = z.object({
  customFieldId: z.string(),
  name: z.string().optional(),
  type: z.string().optional(),
  resourceSubtype: z.string().optional(),
  description: z.string().nullable().optional(),
  enumOptions: z.array(enumOptionOutputSchema).optional(),
  precision: z.number().nullable().optional(),
  format: z.string().nullable().optional(),
  currencyCode: z.string().nullable().optional(),
  hasNotificationsEnabled: z.boolean().optional()
});

export let manageCustomFieldsOutputSchema = z.object({
  customFields: z.array(customFieldOutputSchema).optional(),
  customField: customFieldOutputSchema.optional(),
  enumOption: enumOptionOutputSchema.optional(),
  customFieldCount: z.number().optional()
});

type AsanaEnumOption = {
  gid: string;
  resource_type?: string;
  name?: string;
  color?: string | null;
  enabled?: boolean;
};

type AsanaCustomField = {
  gid: string;
  name?: string;
  type?: string;
  resource_subtype?: string;
  description?: string | null;
  enum_options?: AsanaEnumOption[];
  precision?: number | null;
  format?: string | null;
  currency_code?: string | null;
  has_notifications_enabled?: boolean;
};

export let formatEnumOption = (
  enumOption: AsanaEnumOption
): z.infer<typeof enumOptionOutputSchema> => {
  let formatted: z.infer<typeof enumOptionOutputSchema> = {
    enumOptionId: enumOption.gid,
    gid: enumOption.gid
  };

  if (enumOption.resource_type !== undefined) {
    formatted.resourceType = enumOption.resource_type;
    formatted.resource_type = enumOption.resource_type;
  }
  if (enumOption.name !== undefined) formatted.name = enumOption.name;
  if (enumOption.color !== undefined) formatted.color = enumOption.color;
  if (enumOption.enabled !== undefined) formatted.enabled = enumOption.enabled;

  return formatted;
};

export let formatCustomField = (
  field: AsanaCustomField
): z.infer<typeof customFieldOutputSchema> => ({
  customFieldId: field.gid,
  name: field.name,
  type: field.type,
  resourceSubtype: field.resource_subtype,
  description: field.description,
  enumOptions: field.enum_options?.map(formatEnumOption),
  precision: field.precision,
  format: field.format,
  currencyCode: field.currency_code,
  hasNotificationsEnabled: field.has_notifications_enabled
});
