import { SlateTool } from 'slates';
import { z } from 'zod';
import { TapfiliateClient } from '../lib/client';
import { spec } from '../spec';

let prospectSchema = z.object({
  prospectId: z.string().describe('Unique identifier of the prospect'),
  firstname: z.string().optional().describe('First name'),
  lastname: z.string().optional().describe('Last name'),
  email: z.string().optional().describe('Email address'),
  program: z.any().optional().describe('Assigned program'),
  group: z.any().optional().describe('Assigned group'),
  createdAt: z.string().optional().describe('Creation timestamp')
});

export let createAffiliateProspect = SlateTool.create(spec, {
  name: 'Create Affiliate Prospect',
  key: 'create_affiliate_prospect',
  description: `Create a potential affiliate prospect. Prospects are promoted to full affiliates once they generate a conversion or customer. Optionally assign them to a program or group.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      firstname: z.string().describe('First name of the prospect'),
      lastname: z.string().describe('Last name of the prospect'),
      email: z.string().describe('Email address of the prospect'),
      programId: z.string().optional().describe('Program ID to assign the prospect to'),
      groupId: z.string().optional().describe('Group ID to assign the prospect to')
    })
  )
  .output(prospectSchema)
  .handleInvocation(async ctx => {
    let client = new TapfiliateClient({ token: ctx.auth.token });
    let result = await client.createAffiliateProspect(ctx.input);

    return {
      output: {
        prospectId: result.id,
        firstname: result.firstname,
        lastname: result.lastname,
        email: result.email,
        program: result.program,
        group: result.group,
        createdAt: result.created_at
      },
      message: `Created prospect **${result.firstname} ${result.lastname}** (\`${result.id}\`).`
    };
  })
  .build();

export let listAffiliateProspects = SlateTool.create(spec, {
  name: 'List Affiliate Prospects',
  key: 'list_affiliate_prospects',
  description: `List potential affiliate prospects with optional program filtering. Results are paginated (25 per page).`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      programId: z.string().optional().describe('Filter by program ID'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      prospects: z.array(prospectSchema).describe('List of prospects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TapfiliateClient({ token: ctx.auth.token });
    let results = await client.listAffiliateProspects(ctx.input);

    let prospects = results.map((r: any) => ({
      prospectId: r.id,
      firstname: r.firstname,
      lastname: r.lastname,
      email: r.email,
      program: r.program,
      group: r.group,
      createdAt: r.created_at
    }));

    return {
      output: { prospects },
      message: `Found **${prospects.length}** prospect(s).`
    };
  })
  .build();

export let deleteAffiliateProspect = SlateTool.create(spec, {
  name: 'Delete Affiliate Prospect',
  key: 'delete_affiliate_prospect',
  description: `Permanently delete an affiliate prospect. This action cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      prospectId: z.string().describe('ID of the prospect to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TapfiliateClient({ token: ctx.auth.token });
    await client.deleteAffiliateProspect(ctx.input.prospectId);

    return {
      output: { deleted: true },
      message: `Deleted prospect \`${ctx.input.prospectId}\`.`
    };
  })
  .build();
