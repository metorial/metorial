import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClassMarkerClient } from '../lib/client';
import { spec } from '../spec';

export let manageAccessList = SlateTool.create(spec, {
  name: 'Manage Access List',
  key: 'manage_access_list',
  description: `Add or remove access codes from a ClassMarker access list. Access lists control who can take exams distributed via links. Use this to grant or revoke exam access, for example when a new user registers or when a user completes an exam.`,
  instructions: [
    'Use `action: "add"` to add new codes and `action: "remove"` to remove existing codes.',
    'Each code can be up to 255 characters long.'
  ],
  constraints: [
    'Maximum 100 codes can be removed per request.',
    'Maximum 20,000 total codes per access list.',
    'Access list operations are exempt from the 30 requests/hour rate limit.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      accessListId: z.number().describe('ID of the access list to modify'),
      action: z.enum(['add', 'remove']).describe('Whether to add or remove access codes'),
      codes: z.array(z.string()).describe('Array of access codes to add or remove')
    })
  )
  .output(
    z.object({
      accessListId: z.number().describe('ID of the modified access list'),
      accessListName: z.string().describe('Name of the access list'),
      codesChanged: z.number().describe('Number of codes added or removed'),
      codesTotal: z
        .number()
        .describe('Total number of codes in the access list after the operation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClassMarkerClient({
      token: ctx.auth.token,
      apiSecret: ctx.auth.apiSecret
    });

    let { accessListId, action, codes } = ctx.input;
    let data: any;

    if (action === 'add') {
      data = await client.addAccessCodes(accessListId, codes);
    } else {
      data = await client.removeAccessCodes(accessListId, codes);
    }

    let codesChanged =
      action === 'add' ? data.num_codes_added || 0 : data.num_codes_deleted || 0;

    return {
      output: {
        accessListId: data.access_list_id || accessListId,
        accessListName: data.access_list_name || '',
        codesChanged,
        codesTotal: data.num_codes_total || 0
      },
      message: `Successfully ${action === 'add' ? 'added' : 'removed'} **${codesChanged}** code(s) ${action === 'add' ? 'to' : 'from'} access list "${data.access_list_name}". Total codes: **${data.num_codes_total}**.`
    };
  })
  .build();
