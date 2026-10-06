import { createApiServiceError } from 'slates';
import { z } from 'zod';

export { z };
export const invalid = (message: string) =>
  createApiServiceError(message, { reason: 'invalid_input' });
export const malformed = () =>
  createApiServiceError(
    'Nango returned an unexpected response. Read the exact resource before retrying; a previous operation may already have taken effect.',
    { reason: 'invalid_response' }
  );
export function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw malformed();
  return result.data;
}
export const text = z
  .string()
  .min(1)
  .max(2048)
  .refine(
    value =>
      ![...value].some(c => {
        const code = c.codePointAt(0) ?? 0;
        return code < 32 || code === 127 || (code >= 0xd800 && code <= 0xdfff);
      }),
    'Use a nonempty value without control characters.'
  );
export const integrationId = text.describe(
  'Exact integration ID. Call list_integrations to discover authorized IDs.'
);
export const connectionId = text.describe(
  'Exact connection ID. Call list_connections to discover authorized connection/integration pairs.'
);
export const jsonObject = z.record(z.string(), z.unknown());
export const integrationOutput = z.object({
  uniqueKey: text,
  displayName: z.string().optional(),
  provider: text,
  logo: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});
export const connectionOutput = z.object({
  connectionId: text,
  provider: text,
  providerConfigKey: text,
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  metadata: jsonObject.nullable().optional(),
  credentials: jsonObject.describe(
    'Always empty: connected-provider credentials are not delivered.'
  ),
  tags: z.record(z.string(), z.string()).optional()
});
export const syncSpec = z.union([text, z.object({ name: text, variant: text.optional() })]);
export const nativeIntegration = z.object({
  unique_key: text,
  provider: text,
  display_name: z.string().nullish(),
  logo: z.string().nullish(),
  created_at: z.string().optional(),
  updated_at: z.string().optional()
});
export const nativeConnection = z.object({
  connection_id: text,
  provider_config_key: text,
  provider: text,
  created: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  metadata: jsonObject.nullish(),
  tags: z.record(z.string(), z.string()).optional(),
  errors: z.array(z.object({ type: text, log_id: text })).optional()
});
export const nativeSuccess = z.object({ success: z.boolean() });
export const nativeMetadata = z.object({
  connection_id: z.union([text, z.array(text)]),
  provider_config_key: text,
  metadata: jsonObject
});
export function integrationView(item: z.output<typeof nativeIntegration>) {
  return {
    uniqueKey: item.unique_key,
    provider: item.provider,
    displayName: item.display_name ?? undefined,
    logo: item.logo ?? undefined,
    createdAt: item.created_at,
    updatedAt: item.updated_at
  };
}
export function connectionView(item: z.output<typeof nativeConnection>) {
  return {
    connectionId: item.connection_id,
    providerConfigKey: item.provider_config_key,
    provider: item.provider,
    createdAt: item.created_at ?? item.created,
    updatedAt: item.updated_at,
    metadata: item.metadata,
    tags: item.tags,
    credentials: {}
  };
}
