import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let fieldSchema = z.object({
  fieldName: z.string().describe('Fully qualified field name (e.g., "Space/Name")'),
  fieldType: z.string().describe('Field type identifier (e.g., "fibery/text", "fibery/int")'),
  description: z.string().optional().describe('Field description if available')
});

let typeSchema = z.object({
  typeName: z.string().describe('Fully qualified type name (e.g., "Space/TypeName")'),
  description: z.string().optional().describe('Type description if available'),
  fields: z.array(fieldSchema).describe('Fields defined on this type')
});

export let getSchemaTool = SlateTool.create(spec, {
  name: 'Get Schema',
  key: 'get_schema',
  description: `Retrieve the workspace schema including all Types (databases) and their Fields. Use this to discover the data model of a Fibery workspace before querying or modifying entities. Returns type names and field definitions.`,
  instructions: [
    'Use this tool first to understand the workspace structure before performing entity operations.',
    'Type names are in "Space/TypeName" format (e.g., "Project Management/Task").',
    'Field names follow the same "Space/FieldName" pattern.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      typeNameFilter: z
        .string()
        .optional()
        .describe(
          'Optional filter to return only types whose name contains this string (case-insensitive)'
        )
    })
  )
  .output(
    z.object({
      types: z.array(typeSchema).describe('List of types (databases) in the workspace')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      accountName: ctx.config.accountName,
      token: ctx.auth.token
    });

    let schema = await client.getSchema();
    let fiberyTypes: any[] = schema?.['fibery/types'] || [];

    // Filter out internal types
    let userTypes = fiberyTypes.filter((t: any) => {
      let name: string = t['fibery/name'] || '';
      // Skip Fibery internal types
      if (
        name.startsWith('fibery/') ||
        name.startsWith('Collaboration~Documents/') ||
        name.startsWith('workflow/')
      ) {
        return false;
      }
      return true;
    });

    if (ctx.input.typeNameFilter) {
      let filter = ctx.input.typeNameFilter.toLowerCase();
      userTypes = userTypes.filter((t: any) =>
        (t['fibery/name'] || '').toLowerCase().includes(filter)
      );
    }

    let types = userTypes.map((t: any) => {
      let fields = (t['fibery/fields'] || [])
        .filter((f: any) => {
          let fname: string = f['fibery/name'] || '';
          // Filter out some internal fields
          if (
            fname === 'fibery/id' ||
            fname === 'fibery/public-id' ||
            fname === 'fibery/rank'
          ) {
            return true;
          }
          if (
            fname.startsWith('fibery/') &&
            fname !== 'fibery/creation-date' &&
            fname !== 'fibery/modification-date' &&
            fname !== 'fibery/created-by'
          ) {
            return false;
          }
          return true;
        })
        .map((f: any) => ({
          fieldName: f['fibery/name'] || '',
          fieldType: f['fibery/type']?.['fibery/name'] || f['fibery/type'] || '',
          ...(f['fibery/description'] ? { description: f['fibery/description'] } : {})
        }));

      return {
        typeName: t['fibery/name'] || '',
        ...(t['fibery/description'] ? { description: t['fibery/description'] } : {}),
        fields
      };
    });

    return {
      output: { types },
      message: `Retrieved schema with **${types.length}** types from the workspace.`
    };
  })
  .build();
