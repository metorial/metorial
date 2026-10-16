import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, parseItems } from '../lib/client';
import { spec } from '../spec';

export let validateLicensee = SlateTool.create(spec, {
  name: 'Validate Licensee',
  key: 'validate_licensee',
  description: `Validate a licensee's active licenses against the configured licensing models. Returns the complete licensing state for the licensee across all product modules, ready for use in business logic. Can also pass custom validation parameters.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      licenseeNumber: z.string().describe('Licensee number to validate'),
      productNumber: z.string().optional().describe('Limit validation to a specific product'),
      licenseeName: z.string().optional().describe('Licensee name for identification'),
      customProperties: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom key-value properties to pass during validation')
    })
  )
  .output(
    z.object({
      ttl: z
        .string()
        .optional()
        .describe('Validation response expiration timestamp (ISO 8601)'),
      validations: z
        .array(
          z.object({
            productModuleNumber: z.string().optional().describe('Product module number'),
            productModuleName: z.string().optional().describe('Product module name'),
            licensingModel: z.string().optional().describe('Licensing model'),
            valid: z.boolean().optional().describe('Whether the module is valid'),
            expires: z.string().optional().describe('Expiration date if applicable'),
            properties: z
              .record(z.string(), z.any())
              .optional()
              .describe('Additional validation properties')
          })
        )
        .describe('Validation results per product module')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let params: Record<string, any> = {};

    if (ctx.input.productNumber) params.productNumber = ctx.input.productNumber;
    if (ctx.input.licenseeName) params.licenseeName = ctx.input.licenseeName;
    if (ctx.input.customProperties) {
      for (let [key, value] of Object.entries(ctx.input.customProperties)) {
        params[key] = value;
      }
    }

    let response = await client.validateLicensee(ctx.input.licenseeNumber, params);

    // Current responses carry TTL at the root; retain the legacy info fallback.
    let ttl = response.ttl;
    if (response.infos?.info) {
      let ttlInfo = response.infos.info.find(i => i.id === 'ttl');
      if (ttl === undefined && ttlInfo) ttl = ttlInfo.value;
    }

    // Parse validation items
    let allItems = parseItems(response, 'ProductModuleValidation');
    let validations = allItems.map(item => {
      let { productModuleNumber, productModuleName, licensingModel, ...rest } = item;
      let valid: boolean | undefined;

      // Nested model-specific results remain available under properties.
      if (rest.valid !== undefined) {
        valid = rest.valid === true || rest.valid === 'true';
      }

      return {
        productModuleNumber,
        productModuleName,
        licensingModel,
        valid,
        expires: rest.expires,
        properties: rest
      };
    });

    let state = validations.some(v => v.valid === false)
      ? 'INVALID'
      : validations.length > 0 && validations.every(v => v.valid === true)
        ? 'VALID'
        : 'See module properties';

    return {
      output: { ttl, validations },
      message: `Validation for licensee **${ctx.input.licenseeNumber}**: **${state}** across ${validations.length} module(s).${ttl ? ` TTL: ${ttl}` : ''}`
    };
  })
  .build();
