import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listAttributeClasses = SlateTool.create(spec, {
  name: 'List Attribute Classes',
  key: 'list_attribute_classes',
  description: `List all attribute classes in the environment. Attribute classes define custom properties on contacts used for segmentation and targeting.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      attributeClasses: z.array(
        z.object({
          attributeClassId: z.string().describe('Unique attribute class identifier'),
          name: z.string().describe('Attribute class name'),
          type: z.string().optional().describe('Attribute class type'),
          description: z.string().optional().describe('Attribute class description'),
          environmentId: z.string().optional().describe('Environment ID'),
          createdAt: z.string().optional().describe('Creation timestamp')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let classes = await client.listAttributeClasses();

    let mapped = classes.map((ac: any) => ({
      attributeClassId: ac.id,
      name: ac.name ?? '',
      type: ac.type,
      description: ac.description,
      environmentId: ac.environmentId,
      createdAt: ac.createdAt ?? ''
    }));

    return {
      output: { attributeClasses: mapped },
      message: `Found **${mapped.length}** attribute class(es).`
    };
  })
  .build();

export let createAttributeClass = SlateTool.create(spec, {
  name: 'Create Attribute Class',
  key: 'create_attribute_class',
  description: `Create a new attribute class to define a custom property on contacts. Attributes are used for segmentation and survey targeting.`
})
  .input(
    z.object({
      environmentId: z
        .string()
        .describe('ID of the environment to create the attribute class in'),
      name: z.string().describe('Name of the attribute class'),
      type: z.enum(['code', 'noCode', 'automatic']).describe('Type of attribute class'),
      description: z.string().optional().describe('Description of the attribute class')
    })
  )
  .output(
    z.object({
      attributeClassId: z.string().describe('ID of the created attribute class'),
      name: z.string().describe('Name of the created attribute class')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let attrClass = await client.createAttributeClass({
      environmentId: ctx.input.environmentId,
      name: ctx.input.name,
      type: ctx.input.type,
      ...(ctx.input.description ? { description: ctx.input.description } : {})
    });

    return {
      output: {
        attributeClassId: attrClass.id,
        name: attrClass.name ?? ctx.input.name
      },
      message: `Created attribute class **${attrClass.name ?? ctx.input.name}** with ID \`${attrClass.id}\`.`
    };
  })
  .build();

export let deleteAttributeClass = SlateTool.create(spec, {
  name: 'Delete Attribute Class',
  key: 'delete_attribute_class',
  description: `Delete an attribute class. This removes the custom property definition from the environment.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      attributeClassId: z.string().describe('ID of the attribute class to delete')
    })
  )
  .output(
    z.object({
      attributeClassId: z.string().describe('ID of the deleted attribute class')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    await client.deleteAttributeClass(ctx.input.attributeClassId);

    return {
      output: {
        attributeClassId: ctx.input.attributeClassId
      },
      message: `Deleted attribute class \`${ctx.input.attributeClassId}\`.`
    };
  })
  .build();
