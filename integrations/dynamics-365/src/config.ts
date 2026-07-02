import { SlateConfig } from 'slates';
import { z } from 'zod';

let commerceIdSchema = z.union([z.string(), z.number()]);

export let config = SlateConfig.create(
  z.object({
    dataverseInstanceUrl: z
      .string()
      .optional()
      .describe(
        'Dynamics 365 Dataverse environment URL, for example https://contoso.crm.dynamics.com.'
      ),
    dataverseApiVersion: z
      .string()
      .optional()
      .describe('Dataverse Web API version. Defaults to v9.2.'),
    finOpsBaseUrl: z
      .string()
      .optional()
      .describe(
        'Dynamics 365 Finance and Operations environment URL, for example https://contoso.operations.dynamics.com.'
      ),
    finOpsDefaultLegalEntity: z
      .string()
      .optional()
      .describe('Default Finance and Operations legal entity / dataAreaId.'),
    finOpsDefaultPageSize: z
      .number()
      .int()
      .min(1)
      .max(10000)
      .optional()
      .describe('Default page size for Finance and Operations OData list tools.'),
    finOpsDefaultMaxPages: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe('Default maximum number of Finance and Operations OData pages to fetch.'),
    projectOperationsDefaultPageSize: z
      .number()
      .int()
      .min(1)
      .max(5000)
      .optional()
      .describe('Default Dataverse page size for Project Operations list actions.'),
    businessCentralTenantId: z
      .string()
      .optional()
      .describe(
        'Optional Business Central tenant ID or domain segment. Omit to use the common Business Central endpoint.'
      ),
    businessCentralEnvironmentName: z
      .string()
      .optional()
      .describe('Default Business Central environment name. Defaults to production.'),
    businessCentralCompanyId: z
      .string()
      .optional()
      .describe('Default Business Central company GUID for company-scoped tools.'),
    businessCentralDefaultLimit: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .optional()
      .describe('Default list page size for Business Central tools. Defaults to 50.'),
    retailServerUrl: z
      .string()
      .optional()
      .describe('Dynamics 365 Commerce Scale Unit Retail Server URL.'),
    commerceOperatingUnitNumber: z
      .string()
      .optional()
      .describe('Default Commerce operating unit number sent as the OUN header.'),
    commerceLocale: z
      .string()
      .optional()
      .describe('Default Commerce locale sent as the Retail Server Accept-Language header.'),
    commerceChannelId: commerceIdSchema.optional().describe('Default Commerce channel id.'),
    commerceCatalogId: commerceIdSchema.optional().describe('Default Commerce catalog id.'),
    commerceDefaultPageSize: z
      .number()
      .int()
      .min(1)
      .max(200)
      .optional()
      .describe('Default page size for paginated Commerce tools.'),
    commerceMaxPageSize: z
      .number()
      .int()
      .min(1)
      .max(200)
      .optional()
      .describe('Maximum page size allowed by Commerce tools.')
  })
);
