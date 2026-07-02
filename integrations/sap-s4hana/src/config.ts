import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    baseUrl: z
      .string()
      .url()
      .describe(
        'SAP S/4HANA tenant root URL or SAP API Hub sandbox root, for example https://mytenant-api.s4hana.cloud.sap or https://sandbox.api.sap.com/s4hanacloud.'
      ),
    sapClient: z
      .string()
      .optional()
      .describe('Optional SAP client number to send as the sap-client OData query parameter.'),
    defaultCompanyCode: z
      .string()
      .optional()
      .describe('Optional default company code for future SAP finance workflows.'),
    defaultSalesOrganization: z
      .string()
      .optional()
      .describe('Optional default sales organization for sales-order workflows.'),
    defaultPurchasingOrganization: z
      .string()
      .optional()
      .describe('Optional default purchasing organization for purchase-order workflows.'),
    sandboxMode: z
      .boolean()
      .optional()
      .describe('Whether this connection targets the SAP Business Accelerator Hub sandbox.')
  })
);
