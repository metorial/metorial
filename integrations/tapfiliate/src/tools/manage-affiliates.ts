import { SlateTool } from 'slates';
import { z } from 'zod';
import { TapfiliateClient } from '../lib/client';
import { spec } from '../spec';

let affiliateSchema = z.object({
  affiliateId: z.string().describe('Unique identifier of the affiliate'),
  firstname: z.string().describe('First name'),
  lastname: z.string().describe('Last name'),
  email: z.string().describe('Email address'),
  company: z.any().optional().describe('Company information'),
  address: z.any().optional().describe('Address information'),
  metaData: z
    .record(z.string(), z.any())
    .optional()
    .describe('Custom metadata key-value pairs'),
  referralLink: z.any().optional().describe('Referral link details'),
  createdAt: z.string().optional().describe('Creation timestamp')
});

export let createAffiliate = SlateTool.create(spec, {
  name: 'Create Affiliate',
  key: 'create_affiliate',
  description: `Create a new affiliate in Tapfiliate. Register affiliates with their personal information, company details, and optional metadata. The affiliate will receive a unique referral link.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      firstname: z.string().describe('First name of the affiliate'),
      lastname: z.string().describe('Last name of the affiliate'),
      email: z.string().describe('Email address of the affiliate'),
      companyName: z.string().optional().describe('Company name'),
      password: z.string().optional().describe('Password for the affiliate portal'),
      address: z
        .object({
          address: z.string().optional().describe('Street address line 1'),
          addressTwo: z.string().optional().describe('Street address line 2'),
          postalCode: z.string().optional().describe('Postal/ZIP code'),
          city: z.string().optional().describe('City'),
          state: z.string().optional().describe('State/province'),
          country: z.string().optional().describe('Country code (e.g., US, NL)')
        })
        .optional()
        .describe('Physical address of the affiliate'),
      metaData: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom key-value metadata to attach')
    })
  )
  .output(affiliateSchema)
  .handleInvocation(async ctx => {
    let client = new TapfiliateClient({ token: ctx.auth.token });
    let result = await client.createAffiliate(ctx.input);

    return {
      output: {
        affiliateId: result.id,
        firstname: result.firstname,
        lastname: result.lastname,
        email: result.email,
        company: result.company,
        address: result.address,
        metaData: result.meta_data,
        referralLink: result.referral_link,
        createdAt: result.created_at
      },
      message: `Created affiliate **${result.firstname} ${result.lastname}** (${result.email}) with ID \`${result.id}\`.`
    };
  })
  .build();

export let getAffiliate = SlateTool.create(spec, {
  name: 'Get Affiliate',
  key: 'get_affiliate',
  description: `Retrieve detailed information about a specific affiliate including their personal data, referral links, programs, and metadata.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      affiliateId: z.string().describe('ID of the affiliate to retrieve')
    })
  )
  .output(affiliateSchema)
  .handleInvocation(async ctx => {
    let client = new TapfiliateClient({ token: ctx.auth.token });
    let result = await client.getAffiliate(ctx.input.affiliateId);

    return {
      output: {
        affiliateId: result.id,
        firstname: result.firstname,
        lastname: result.lastname,
        email: result.email,
        company: result.company,
        address: result.address,
        metaData: result.meta_data,
        referralLink: result.referral_link,
        createdAt: result.created_at
      },
      message: `Retrieved affiliate **${result.firstname} ${result.lastname}** (${result.email}).`
    };
  })
  .build();

export let listAffiliates = SlateTool.create(spec, {
  name: 'List Affiliates',
  key: 'list_affiliates',
  description: `List affiliates with optional filters. Supports filtering by email, referral code, click ID, source ID, parent ID, or affiliate group. Results are paginated (25 per page).`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().optional().describe('Filter by email address'),
      referralCode: z.string().optional().describe('Filter by referral code'),
      clickId: z.string().optional().describe('Filter by click ID'),
      sourceId: z.string().optional().describe('Filter by source ID'),
      parentId: z.string().optional().describe('Filter by MLM parent affiliate ID'),
      affiliateGroupId: z.string().optional().describe('Filter by affiliate group ID'),
      page: z.number().optional().describe('Page number for pagination (default: 1)')
    })
  )
  .output(
    z.object({
      affiliates: z.array(affiliateSchema).describe('List of affiliates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TapfiliateClient({ token: ctx.auth.token });
    let results = await client.listAffiliates(ctx.input);

    let affiliates = results.map((r: any) => ({
      affiliateId: r.id,
      firstname: r.firstname,
      lastname: r.lastname,
      email: r.email,
      company: r.company,
      address: r.address,
      metaData: r.meta_data,
      referralLink: r.referral_link,
      createdAt: r.created_at
    }));

    return {
      output: { affiliates },
      message: `Found **${affiliates.length}** affiliate(s).`
    };
  })
  .build();

export let deleteAffiliate = SlateTool.create(spec, {
  name: 'Delete Affiliate',
  key: 'delete_affiliate',
  description: `Permanently delete an affiliate from Tapfiliate. This action cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      affiliateId: z.string().describe('ID of the affiliate to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TapfiliateClient({ token: ctx.auth.token });
    await client.deleteAffiliate(ctx.input.affiliateId);

    return {
      output: { deleted: true },
      message: `Deleted affiliate \`${ctx.input.affiliateId}\`.`
    };
  })
  .build();

export let updateAffiliateMetaData = SlateTool.create(spec, {
  name: 'Update Affiliate Metadata',
  key: 'update_affiliate_metadata',
  description: `Set or replace metadata on an affiliate. Metadata is stored as key-value pairs. When replacing all metadata, any existing keys not included will be removed.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      affiliateId: z.string().describe('ID of the affiliate'),
      metaData: z
        .record(z.string(), z.string())
        .describe('Key-value metadata to set. Replaces all existing metadata.')
    })
  )
  .output(
    z.object({
      metaData: z.record(z.string(), z.any()).describe('Updated metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TapfiliateClient({ token: ctx.auth.token });
    let result = await client.setAffiliateMetaData(ctx.input.affiliateId, ctx.input.metaData);

    return {
      output: { metaData: result },
      message: `Updated metadata for affiliate \`${ctx.input.affiliateId}\`.`
    };
  })
  .build();

export let manageAffiliateGroup = SlateTool.create(spec, {
  name: 'Manage Affiliate Group Assignment',
  key: 'manage_affiliate_group',
  description: `Assign an affiliate to a group or remove them from their current group. Groups are used to organize affiliates and can apply different commission rates.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      affiliateId: z.string().describe('ID of the affiliate'),
      action: z
        .enum(['assign', 'remove'])
        .describe('Whether to assign to or remove from a group'),
      groupId: z
        .string()
        .optional()
        .describe('Group ID to assign the affiliate to (required when action is "assign")')
    })
  )
  .output(
    z.object({
      affiliateId: z.string().describe('ID of the affiliate'),
      groupId: z.string().optional().describe('ID of the assigned group, if any')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TapfiliateClient({ token: ctx.auth.token });

    if (ctx.input.action === 'assign') {
      if (!ctx.input.groupId) {
        throw new Error('groupId is required when action is "assign"');
      }
      let _result = await client.setAffiliateGroup(ctx.input.affiliateId, ctx.input.groupId);
      return {
        output: { affiliateId: ctx.input.affiliateId, groupId: ctx.input.groupId },
        message: `Assigned affiliate \`${ctx.input.affiliateId}\` to group \`${ctx.input.groupId}\`.`
      };
    } else {
      await client.removeAffiliateGroup(ctx.input.affiliateId);
      return {
        output: { affiliateId: ctx.input.affiliateId },
        message: `Removed affiliate \`${ctx.input.affiliateId}\` from their group.`
      };
    }
  })
  .build();

export let manageAffiliatePayoutMethod = SlateTool.create(spec, {
  name: 'Manage Affiliate Payout Method',
  key: 'manage_affiliate_payout_method',
  description: `Get or set the payout method for an affiliate. Supports retrieving the current payout method or setting a new one (e.g., PayPal).`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      affiliateId: z.string().describe('ID of the affiliate'),
      action: z.enum(['get', 'set']).describe('Whether to get or set the payout method'),
      payoutMethod: z
        .object({
          type: z.string().optional().describe('Payout method type (e.g., "paypal")'),
          paypalEmail: z
            .string()
            .optional()
            .describe('PayPal email address (when type is "paypal")')
        })
        .optional()
        .describe('Payout method details (required when action is "set")')
    })
  )
  .output(
    z.object({
      payoutMethod: z.any().describe('Current payout method configuration')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TapfiliateClient({ token: ctx.auth.token });

    if (ctx.input.action === 'get') {
      let result = await client.getAffiliatePayoutMethod(ctx.input.affiliateId);
      return {
        output: { payoutMethod: result },
        message: `Retrieved payout method for affiliate \`${ctx.input.affiliateId}\`.`
      };
    } else {
      if (!ctx.input.payoutMethod) {
        throw new Error('payoutMethod is required when action is "set"');
      }
      let body: Record<string, any> = {};
      if (ctx.input.payoutMethod.type) body.type = ctx.input.payoutMethod.type;
      if (ctx.input.payoutMethod.paypalEmail)
        body.paypal_email = ctx.input.payoutMethod.paypalEmail;
      let result = await client.setAffiliatePayoutMethod(ctx.input.affiliateId, body);
      return {
        output: { payoutMethod: result },
        message: `Updated payout method for affiliate \`${ctx.input.affiliateId}\`.`
      };
    }
  })
  .build();
