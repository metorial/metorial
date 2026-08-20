import { configV2 } from 'slates';
import { z } from 'zod';

let commerceIdSchema = z.union([z.string(), z.number()]);

export let config = configV2({
  fields: {
    dataverseInstanceUrl: {
      schema: z
        .string()
        .optional()
        .describe(
          'Dynamics 365 Dataverse environment URL, for example https://contoso.crm.dynamics.com.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    dataverseApiVersion: {
      schema: z.string().optional().describe('Dataverse Web API version. Defaults to v9.2.'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    recordChangedEntitySetName: {
      schema: z
        .string()
        .optional()
        .describe(
          'OData entity set name polled by the record_changed trigger, for example contacts. Defaults to accounts.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    finOpsBaseUrl: {
      schema: z
        .string()
        .optional()
        .describe(
          'Dynamics 365 Finance and Operations environment URL, for example https://contoso.operations.dynamics.com.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    finOpsDefaultLegalEntity: {
      schema: z
        .string()
        .optional()
        .describe('Default Finance and Operations legal entity / dataAreaId.'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    finOpsDefaultPageSize: {
      schema: z
        .number()
        .int()
        .min(1)
        .max(10000)
        .optional()
        .describe('Default page size for Finance and Operations OData list tools.'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    finOpsDefaultMaxPages: {
      schema: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Default maximum number of Finance and Operations OData pages to fetch.'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    projectOperationsDefaultPageSize: {
      schema: z
        .number()
        .int()
        .min(1)
        .max(5000)
        .optional()
        .describe('Default Dataverse page size for Project Operations list actions.'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    businessCentralTenantId: {
      schema: z
        .string()
        .optional()
        .describe(
          'Optional Business Central tenant ID or domain segment. Omit to use the common Business Central endpoint.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    businessCentralEnvironmentName: {
      schema: z
        .string()
        .optional()
        .describe('Default Business Central environment name. Defaults to production.'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    businessCentralCompanyId: {
      schema: z
        .string()
        .optional()
        .describe('Default Business Central company GUID for company-scoped tools.'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    businessCentralDefaultLimit: {
      schema: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .optional()
        .describe('Default list page size for Business Central tools. Defaults to 50.'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    retailServerUrl: {
      schema: z
        .string()
        .optional()
        .describe('Dynamics 365 Commerce Scale Unit Retail Server URL.'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    commerceOperatingUnitNumber: {
      schema: z
        .string()
        .optional()
        .describe('Default Commerce operating unit number sent as the OUN header.'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    commerceLocale: {
      schema: z
        .string()
        .optional()
        .describe('Default Commerce locale sent as the Retail Server Accept-Language header.'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    commerceChannelId: {
      schema: commerceIdSchema.optional().describe('Default Commerce channel id.'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    commerceCatalogId: {
      schema: commerceIdSchema.optional().describe('Default Commerce catalog id.'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    commerceDefaultPageSize: {
      schema: z
        .number()
        .int()
        .min(1)
        .max(200)
        .optional()
        .describe('Default page size for paginated Commerce tools.'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    commerceMaxPageSize: {
      schema: z
        .number()
        .int()
        .min(1)
        .max(200)
        .optional()
        .describe('Maximum page size allowed by Commerce tools.'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
