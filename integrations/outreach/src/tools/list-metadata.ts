import { createApiServiceError, isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { flattenResource, validateInput } from '../lib/helpers';
import { spec } from '../spec';

export const listMetadata = SlateTool.create(spec, {
  name: 'List Outreach Metadata',
  key: 'list_metadata',
  description:
    'Discover mailboxes, call dispositions and purposes, prospect stages, opportunity stages or configured custom-field definitions. Returns safe identifiers and labels; mailbox credentials are excluded. Opportunity stages require the Opportunities feature.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      resource: z
        .enum([
          'mailboxes',
          'callDispositions',
          'callPurposes',
          'stages',
          'opportunityStages',
          'custom_fields'
        ])
        .describe('Metadata collection to discover.'),
      pageSize: z
        .number()
        .optional()
        .describe('Results per page from 1 to 1000; not used for custom_fields.'),
      pageOffset: z
        .number()
        .optional()
        .describe('Legacy offset from 0 to 10000; not used for custom_fields.'),
      pageAfter: z
        .string()
        .optional()
        .describe('Returned nextPageAfter cursor; not used for custom_fields.')
    })
  )
  .output(
    z.object({
      records: z.array(
        z.object({
          id: z.string().optional(),
          type: z.string(),
          name: z.string().optional(),
          email: z.string().optional(),
          userId: z.string().optional(),
          sendDisabled: z.boolean().optional(),
          outcome: z.string().optional(),
          order: z.number().optional(),
          fieldDefinitions: z
            .array(
              z.object({
                key: z.string(),
                type: z.string().optional(),
                label: z.string().optional(),
                required: z.boolean().optional(),
                definition: z.unknown().optional()
              })
            )
            .optional()
        })
      ),
      hasMore: z.boolean(),
      nextPageAfter: z.string().optional(),
      nextPageOffset: z.number().optional(),
      totalCount: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    validateInput(ctx.input);
    const client = new Client({ token: ctx.auth.token });
    if (ctx.input.resource === 'custom_fields') {
      if (
        ctx.input.pageSize !== undefined ||
        ctx.input.pageOffset !== undefined ||
        ctx.input.pageAfter !== undefined
      )
        throw createApiServiceError(
          'Custom-field definitions are returned together; omit pagination fields.'
        );
      const records = (await client.getFieldTypes()).map(value => {
        if (
          !isApiErrorRecord(value) ||
          typeof value.type !== 'string' ||
          (value.meta !== undefined && !isApiErrorRecord(value.meta))
        )
          throw createApiServiceError('Outreach returned invalid field definitions.');
        const validations = isApiErrorRecord(value.meta) ? value.meta.validations : undefined;
        if (validations !== undefined && !isApiErrorRecord(validations))
          throw createApiServiceError('Outreach returned invalid field definitions.');
        const fieldDefinitions = Object.entries(validations ?? {})
          .filter(([key]) => /^custom[1-9]\d*$/.test(key))
          .map(([key, definition]) => {
            if (
              !isApiErrorRecord(definition) ||
              (definition.type !== undefined && typeof definition.type !== 'string') ||
              (definition.label !== undefined && typeof definition.label !== 'string') ||
              (definition.required !== undefined && typeof definition.required !== 'boolean')
            )
              throw createApiServiceError(
                'Outreach returned an invalid custom-field definition.'
              );
            return {
              key,
              type: definition.type as string | undefined,
              label: definition.label as string | undefined,
              required: definition.required as boolean | undefined,
              definition: definition.definition
            };
          });
        return { type: value.type, fieldDefinitions };
      });
      return {
        output: { records, hasMore: false },
        message: `Found custom-field definitions for ${records.length} resource types.`
      };
    }
    const params: Record<string, string> = {};
    if (ctx.input.pageSize !== undefined) params['page[limit]'] = String(ctx.input.pageSize);
    if (ctx.input.pageOffset !== undefined)
      params['page[offset]'] = String(ctx.input.pageOffset);
    if (ctx.input.pageAfter !== undefined) params['page[after]'] = ctx.input.pageAfter;
    const result = await client.listResources(ctx.input.resource, params);
    const records = result.records.map(resource => {
      const row = flattenResource(resource);
      // Never spread mailbox attributes: the provider resource also contains credential fields.
      return {
        id: row.id,
        type: row.type,
        name: row.name,
        email: row.email,
        userId: row.userId,
        sendDisabled: row.sendDisabled,
        outcome: row.outcome,
        order: row.order
      };
    });
    return {
      output: {
        records,
        hasMore: result.hasMore,
        nextPageAfter: result.nextPageAfter,
        nextPageOffset: result.nextPageOffset,
        totalCount: result.totalCount ?? undefined
      },
      message: `Found ${records.length} metadata records.`
    };
  })
  .build();
