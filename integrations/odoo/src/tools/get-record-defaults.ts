import { buildApiServiceError, createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getRecordDefaults = SlateTool.create(spec, {
  name: 'Get Record Defaults',
  key: 'get_record_defaults',
  description:
    'Inspect the default values Odoo would use for selected fields when creating a record. Defaults can depend on the connected user, company, and context. Use this with list_model_fields before create_record.',
  instructions: [
    'Request only the non-binary fields needed for the planned record. Fields without a default are listed separately.',
    'Use the same context for this lookup and create_record, including allowed_company_ids or default_<field> values when needed.',
    'Defaults are a snapshot and can change before a later record creation.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      model: z
        .string()
        .trim()
        .min(1)
        .max(128)
        .describe('Technical model name. Call list_models to discover accessible models.'),
      fields: z
        .array(z.string().trim().min(1).max(128))
        .min(1)
        .max(100)
        .describe(
          'Up to 100 non-binary field names. Call list_model_fields to discover them.'
        ),
      context: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Optional Odoo context, such as {"allowed_company_ids":[1]} or {"default_type":"opportunity"}'
        )
    })
  )
  .output(
    z.object({
      model: z.string(),
      defaults: z
        .record(z.string(), z.unknown())
        .describe('Requested field values with a default'),
      fieldsWithoutDefaults: z
        .array(z.string())
        .describe('Requested fields with no default value')
    })
  )
  .handleInvocation(async ctx => {
    let { model, context } = ctx.input;
    let fields = [...new Set(ctx.input.fields)];
    try {
      let client = createClient(ctx);
      let fieldArguments = {
        allfields: fields,
        attributes: ['type'],
        ...(context === undefined ? {} : { context })
      };
      let metadata = await client.callModelMethod({
        model,
        method: 'fields_get',
        arguments: fieldArguments,
        legacyKeywordArguments: fieldArguments
      });
      let metadataResult = z
        .record(z.string(), z.object({ type: z.string() }))
        .safeParse(metadata);
      if (!metadataResult.success) {
        throw createApiServiceError(
          'Odoo returned invalid field definitions for the defaults lookup.',
          {
            reason: 'odoo_record_defaults_fields_invalid'
          }
        );
      }
      for (let field of fields) {
        let definition = metadataResult.data[field];
        if (!definition) {
          throw createApiServiceError(
            `Field "${field}" is unavailable on ${model}. Use list_model_fields to select accessible fields.`,
            {
              reason: 'odoo_record_defaults_field_unavailable'
            }
          );
        }
        if (definition.type === 'binary') {
          throw createApiServiceError(
            `Field "${field}" stores binary content. Request non-binary fields for this defaults lookup.`,
            {
              reason: 'odoo_record_defaults_binary_field'
            }
          );
        }
      }

      let result = await client.callModelMethod({
        model,
        method: 'default_get',
        arguments: { fields, ...(context === undefined ? {} : { context }) },
        legacyArguments: [fields],
        legacyKeywordArguments: context === undefined ? undefined : { context }
      });
      let parsed = z.record(z.string(), z.unknown()).safeParse(result);
      if (!parsed.success) {
        throw createApiServiceError('Odoo returned invalid record defaults.', {
          reason: 'odoo_record_defaults_response_invalid'
        });
      }
      let defaults = Object.fromEntries(
        fields
          .filter(field => Object.hasOwn(parsed.data, field))
          .map(field => [field, parsed.data[field]])
      );
      let fieldsWithoutDefaults = fields.filter(field => !Object.hasOwn(defaults, field));
      return {
        output: { model, defaults, fieldsWithoutDefaults },
        message: `Found defaults for **${Object.keys(defaults).length}** requested field(s) on \`${model}\`.`
      };
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Odoo',
        operation: `retrieving defaults for ${model}`,
        reason: 'odoo_get_record_defaults_failed'
      });
    }
  })
  .build();
