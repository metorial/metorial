import { SlateConfig } from 'slates';
import { z } from 'zod';

export let unimicroEnvironmentSchema = z
  .enum(['test', 'unimicro', 'custom'])
  .describe(
    'UniMicro platform environment. Use custom for DNB, Eika, Azets, SpareBank 1, or private platform hosts.'
  );

export type UnimicroEnvironment = z.infer<typeof unimicroEnvironmentSchema>;

export let configSchema = z.object({
  environment: unimicroEnvironmentSchema,
  companyKey: z
    .string()
    .optional()
    .describe(
      'Default UniMicro CompanyKey for business API calls. Use list_companies to discover available company keys.'
    ),
  customAppFrameworkUrl: z
    .string()
    .url()
    .optional()
    .describe(
      'Custom AppFramework/base URL, for example https://system.eikaregnskap.no/. Required when environment is custom unless the OAuth token contains an AppFramework claim.'
    ),
  customIdentityUrl: z
    .string()
    .url()
    .optional()
    .describe(
      'Custom identity/login URL for OAuth when environment is custom, for example https://login.regnskap.sparebank1.no/.'
    ),
  customFilesUrl: z
    .string()
    .url()
    .optional()
    .describe('Custom file server URL when environment is custom.'),
  defaultTop: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .describe('Default page size for UniMicro list tools. Defaults to 50.')
});

export type UnimicroConfig = z.infer<typeof configSchema>;

export let config = SlateConfig.create(configSchema);
