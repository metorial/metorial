import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    baseUrl: {
      schema: z
        .string()
        .url()
        .describe(
          'SAP S/4HANA tenant root URL or SAP API Hub sandbox root, for example https://mytenant-api.s4hana.cloud.sap or https://sandbox.api.sap.com/s4hanacloud.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    sapClient: {
      schema: z
        .string()
        .optional()
        .describe(
          'Optional SAP client number to send as the sap-client OData query parameter.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    defaultCompanyCode: {
      schema: z
        .string()
        .optional()
        .describe('Optional default company code for future SAP finance workflows.'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    defaultSalesOrganization: {
      schema: z
        .string()
        .optional()
        .describe('Optional default sales organization for sales-order workflows.'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    defaultPurchasingOrganization: {
      schema: z
        .string()
        .optional()
        .describe('Optional default purchasing organization for purchase-order workflows.'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    sandboxMode: {
      schema: z
        .boolean()
        .optional()
        .describe('Whether this connection targets the SAP Business Accelerator Hub sandbox.'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
