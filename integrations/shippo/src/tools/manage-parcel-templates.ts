import { SlateTool } from 'slates';
import { z } from 'zod';
import { ShippoClient } from '../lib/client';
import { spec } from '../spec';

export let createParcelTemplate = SlateTool.create(spec, {
  name: 'Create Parcel Template',
  key: 'create_parcel_template',
  description: `Create a reusable parcel template with preset dimensions and weight. Useful for standardized packaging. You can base it on a carrier parcel template or define fully custom dimensions.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the parcel template'),
      length: z.string().describe('Length'),
      width: z.string().describe('Width'),
      height: z.string().describe('Height'),
      distanceUnit: z.enum(['cm', 'in', 'ft', 'mm', 'm', 'yd']).describe('Dimension unit'),
      weight: z.string().optional().describe('Default weight'),
      massUnit: z.enum(['g', 'oz', 'lb', 'kg']).optional().describe('Weight unit'),
      template: z.string().optional().describe('Base carrier parcel template token')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('Unique template identifier'),
      name: z.string().optional(),
      length: z.string().optional(),
      width: z.string().optional(),
      height: z.string().optional(),
      distanceUnit: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ShippoClient(ctx.auth.token);

    let result = (await client.createUserParcelTemplate({
      name: ctx.input.name,
      length: ctx.input.length,
      width: ctx.input.width,
      height: ctx.input.height,
      distance_unit: ctx.input.distanceUnit,
      weight: ctx.input.weight,
      mass_unit: ctx.input.massUnit,
      template: ctx.input.template
    })) as Record<string, any>;

    return {
      output: {
        templateId: result.object_id,
        name: result.name,
        length: result.length,
        width: result.width,
        height: result.height,
        distanceUnit: result.distance_unit
      },
      message: `Parcel template **${ctx.input.name}** created (${result.object_id}).`
    };
  })
  .build();

export let listParcelTemplates = SlateTool.create(spec, {
  name: 'List Parcel Templates',
  key: 'list_parcel_templates',
  description: `List all user-created parcel templates and optionally carrier-provided parcel templates. Carrier templates include predefined dimensions (e.g. USPS Flat Rate boxes).`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      includeCarrierTemplates: z
        .boolean()
        .optional()
        .describe('Also include carrier-provided parcel templates'),
      carrier: z.string().optional().describe('Filter carrier templates by carrier name')
    })
  )
  .output(
    z.object({
      userTemplates: z.array(
        z.object({
          templateId: z.string(),
          name: z.string().optional(),
          length: z.string().optional(),
          width: z.string().optional(),
          height: z.string().optional(),
          distanceUnit: z.string().optional()
        })
      ),
      carrierTemplates: z
        .array(
          z.object({
            token: z.string(),
            carrier: z.string().optional(),
            name: z.string().optional(),
            length: z.string().optional(),
            width: z.string().optional(),
            height: z.string().optional(),
            distanceUnit: z.string().optional()
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ShippoClient(ctx.auth.token);

    let userResult = (await client.listUserParcelTemplates()) as Record<string, any>;
    let userTemplates = (userResult.results || []).map((t: any) => ({
      templateId: t.object_id,
      name: t.name,
      length: t.length,
      width: t.width,
      height: t.height,
      distanceUnit: t.distance_unit
    }));

    let carrierTemplates: any[] | undefined;
    if (ctx.input.includeCarrierTemplates) {
      let carrierResult = (await client.listCarrierParcelTemplates({
        carrier: ctx.input.carrier
      })) as Record<string, any>;
      carrierTemplates = (carrierResult.results || []).map((t: any) => ({
        token: t.token,
        carrier: t.carrier,
        name: t.name,
        length: t.length,
        width: t.width,
        height: t.height,
        distanceUnit: t.distance_unit
      }));
    }

    return {
      output: {
        userTemplates,
        carrierTemplates
      },
      message: `Found **${userTemplates.length}** user templates.${carrierTemplates ? ` ${carrierTemplates.length} carrier templates.` : ''}`
    };
  })
  .build();
