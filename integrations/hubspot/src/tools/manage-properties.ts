import { SlateTool } from 'slates';
import { z } from 'zod';
import { HubSpotClient } from '../lib/client';
import { hubSpotActionScopes } from '../lib/scopes';
import { spec } from '../spec';

let propertyOutputSchema = z.object({
  name: z.string().describe('Property internal name'),
  label: z.string().describe('Property display label'),
  type: z
    .string()
    .describe('Property type (string, number, date, datetime, enumeration, bool)'),
  fieldType: z
    .string()
    .describe('Field type (text, textarea, number, select, checkbox, date, etc.)'),
  groupName: z.string().optional().describe('Property group name'),
  description: z.string().optional().describe('Property description'),
  options: z
    .array(
      z.object({
        label: z.string().describe('Option label'),
        value: z.string().describe('Option value'),
        displayOrder: z.number().optional().describe('Display order')
      })
    )
    .optional()
    .describe('Enumeration options'),
  calculated: z.boolean().optional().describe('Whether the property is calculated'),
  hasUniqueValue: z.boolean().optional().describe('Whether values must be unique')
});

export let listProperties = SlateTool.create(spec, {
  name: 'List Properties',
  key: 'list_properties',
  description: `List all properties defined for a CRM object type in HubSpot. Returns both default and custom properties with their configurations.`,
  tags: { readOnly: true }
})
  .scopes(hubSpotActionScopes.listProperties)
  .input(
    z.object({
      objectType: z
        .string()
        .describe('CRM object type (e.g., contacts, companies, deals, tickets)')
    })
  )
  .output(
    z.object({
      properties: z.array(propertyOutputSchema).describe('List of properties')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HubSpotClient(ctx.auth.token);
    let result = await client.listProperties(ctx.input.objectType);

    let properties = (result.results || []).map((p: any) => ({
      name: p.name,
      label: p.label,
      type: p.type,
      fieldType: p.fieldType,
      groupName: p.groupName,
      description: p.description,
      options: p.options?.map((o: any) => ({
        label: o.label,
        value: o.value,
        displayOrder: o.displayOrder
      })),
      calculated: p.calculated,
      hasUniqueValue: p.hasUniqueValue
    }));

    return {
      output: { properties },
      message: `Found **${properties.length}** properties for ${ctx.input.objectType}`
    };
  })
  .build();

export let createProperty = SlateTool.create(spec, {
  name: 'Create Property',
  key: 'create_property',
  description: `Create a new custom property on a CRM object type in HubSpot. Define the property name, type, field type, and optionally enumeration options.`,
  instructions: [
    'Property types: string, number, date, datetime, enumeration, bool.',
    'Field types: text, textarea, number, select, checkbox, date, booleancheckbox, radio, calculation_equation.',
    'For enumeration type, provide options with label and value.'
  ],
  tags: { destructive: false, readOnly: false }
})
  .scopes(hubSpotActionScopes.createProperty)
  .input(
    z.object({
      objectType: z
        .string()
        .describe('CRM object type (e.g., contacts, companies, deals, tickets)'),
      name: z.string().describe('Internal property name (alphanumeric and underscores)'),
      label: z.string().describe('Display label for the property'),
      type: z
        .enum(['string', 'number', 'date', 'datetime', 'enumeration', 'bool'])
        .describe('Property data type'),
      fieldType: z
        .string()
        .describe(
          'Field type for the UI (text, textarea, number, select, checkbox, date, booleancheckbox, radio)'
        ),
      groupName: z.string().describe('Property group name (e.g., contactinformation)'),
      description: z.string().optional().describe('Property description'),
      options: z
        .array(
          z.object({
            label: z.string().describe('Option label'),
            value: z.string().describe('Option value'),
            description: z.string().optional().describe('Option description'),
            displayOrder: z.number().optional().describe('Display order')
          })
        )
        .optional()
        .describe('Options for enumeration type properties')
    })
  )
  .output(propertyOutputSchema)
  .handleInvocation(async ctx => {
    let client = new HubSpotClient(ctx.auth.token);
    let result = await client.createProperty(ctx.input.objectType, {
      name: ctx.input.name,
      label: ctx.input.label,
      type: ctx.input.type,
      fieldType: ctx.input.fieldType,
      groupName: ctx.input.groupName,
      description: ctx.input.description,
      options: ctx.input.options
    });

    return {
      output: {
        name: result.name,
        label: result.label,
        type: result.type,
        fieldType: result.fieldType,
        groupName: result.groupName,
        description: result.description,
        options: result.options?.map((o: any) => ({
          label: o.label,
          value: o.value,
          displayOrder: o.displayOrder
        })),
        calculated: result.calculated,
        hasUniqueValue: result.hasUniqueValue
      },
      message: `Created property **${result.label}** (${result.name}) on ${ctx.input.objectType}`
    };
  })
  .build();
