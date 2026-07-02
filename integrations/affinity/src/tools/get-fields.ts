import { SlateTool } from 'slates';
import { z } from 'zod';
import { AffinityClient } from '../lib/client';
import { spec } from '../spec';

let fieldSchema = z.object({
  fieldId: z.number().describe('Unique identifier of the field'),
  name: z.string().describe('Field name'),
  listId: z
    .number()
    .nullable()
    .describe('ID of the list this field belongs to (null for global fields)'),
  enrichmentSource: z.string().nullable().describe('Source of enrichment data, if applicable'),
  valueType: z
    .number()
    .describe(
      'Type of value this field holds (0=person, 1=org, 2=dropdown, 3=number, 4=date, 5=location, 6=text, 7=ranked-dropdown)'
    ),
  allowsMultiple: z.boolean().describe('Whether the field accepts multiple values'),
  dropdownOptions: z
    .array(
      z.object({
        optionId: z.number().describe('Dropdown option ID'),
        text: z.string().describe('Dropdown option text'),
        rank: z.number().nullable().describe('Rank for ranked dropdown options'),
        color: z.number().nullable().describe('Color code')
      })
    )
    .optional()
    .describe('Available options for dropdown fields')
});

export let getFields = SlateTool.create(spec, {
  name: 'Get Fields',
  key: 'get_fields',
  description: `Retrieve field definitions (custom columns) from Affinity. Fields can be global or specific to a list. Use this to discover available fields and their IDs before reading or writing field values.

**Value types:**
- **0** = Person, **1** = Organization, **2** = Dropdown, **3** = Number, **4** = Date, **5** = Location, **6** = Text, **7** = Ranked dropdown`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      listId: z.number().optional().describe('Filter fields for a specific list'),
      entityType: z
        .number()
        .optional()
        .describe('Filter by entity type (0=person, 1=organization, 8=opportunity)'),
      withModifiedNames: z.boolean().optional().describe('Include modified field names')
    })
  )
  .output(
    z.object({
      fields: z.array(fieldSchema).describe('List of field definitions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AffinityClient(ctx.auth.token);

    let result = await client.getFields({
      listId: ctx.input.listId,
      entityType: ctx.input.entityType,
      withModifiedNames: ctx.input.withModifiedNames
    });

    let fields = (Array.isArray(result) ? result : []).map((f: any) => ({
      fieldId: f.id,
      name: f.name,
      listId: f.list_id ?? null,
      enrichmentSource: f.enrichment_source ?? null,
      valueType: f.value_type,
      allowsMultiple: f.allows_multiple ?? false,
      dropdownOptions: (f.dropdown_options ?? []).map((o: any) => ({
        optionId: o.id,
        text: o.text,
        rank: o.rank ?? null,
        color: o.color ?? null
      }))
    }));

    return {
      output: { fields },
      message: `Retrieved **${fields.length}** field definition(s).`
    };
  })
  .build();
