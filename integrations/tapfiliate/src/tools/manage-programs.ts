import { SlateTool } from 'slates';
import { z } from 'zod';
import { TapfiliateClient } from '../lib/client';
import { spec } from '../spec';

let programSchema = z.object({
  programId: z.string().describe('Unique identifier of the program'),
  title: z.string().optional().describe('Program title'),
  currency: z.string().optional().describe('Currency code'),
  defaultLandingPageUrl: z.string().optional().describe('Default landing page URL'),
  commissionTypes: z.array(z.any()).optional().describe('Available commission types'),
  mlmLevels: z.array(z.any()).optional().describe('MLM level configurations')
});

export let listPrograms = SlateTool.create(spec, {
  name: 'List Programs',
  key: 'list_programs',
  description: `List all affiliate programs. Programs define commission structures, landing pages, and affiliate relationships. Programs are read-only through the API.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      programs: z.array(programSchema).describe('List of programs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TapfiliateClient({ token: ctx.auth.token });
    let results = await client.listPrograms(ctx.input);

    let programs = results.map((r: any) => ({
      programId: r.id,
      title: r.title,
      currency: r.currency,
      defaultLandingPageUrl: r.default_landing_page_url
    }));

    return {
      output: { programs },
      message: `Found **${programs.length}** program(s).`
    };
  })
  .build();

export let getProgram = SlateTool.create(spec, {
  name: 'Get Program',
  key: 'get_program',
  description: `Retrieve detailed information about a specific affiliate program, including its commission types, MLM levels, and bonuses.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      programId: z.string().describe('ID of the program')
    })
  )
  .output(programSchema)
  .handleInvocation(async ctx => {
    let client = new TapfiliateClient({ token: ctx.auth.token });
    let [program, commissionTypes, mlmLevels] = await Promise.all([
      client.getProgram(ctx.input.programId),
      client.listProgramCommissionTypes(ctx.input.programId).catch(() => []),
      client.listProgramMlmLevels(ctx.input.programId).catch(() => [])
    ]);

    return {
      output: {
        programId: program.id,
        title: program.title,
        currency: program.currency,
        defaultLandingPageUrl: program.default_landing_page_url,
        commissionTypes,
        mlmLevels
      },
      message: `Retrieved program **${program.title}** (\`${program.id}\`).`
    };
  })
  .build();

export let manageProgramAffiliate = SlateTool.create(spec, {
  name: 'Manage Program Affiliate',
  key: 'manage_program_affiliate',
  description: `Add, approve, disapprove, or update an affiliate within a program. Use this to manage the relationship between affiliates and programs, including approval status and coupon assignments.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      programId: z.string().describe('ID of the program'),
      affiliateId: z.string().describe('ID of the affiliate'),
      action: z.enum(['add', 'approve', 'disapprove', 'update']).describe('Action to perform'),
      approved: z.boolean().optional().describe('Approval status (for "add" action)'),
      coupon: z
        .string()
        .optional()
        .describe('Coupon code to assign (for "add" or "update" action)')
    })
  )
  .output(
    z.object({
      affiliateId: z.string().describe('ID of the affiliate'),
      programId: z.string().describe('ID of the program'),
      approved: z.boolean().optional().describe('Current approval status'),
      coupon: z.string().optional().describe('Assigned coupon code')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TapfiliateClient({ token: ctx.auth.token });
    let result: any;

    switch (ctx.input.action) {
      case 'add':
        result = await client.addAffiliateToProgram(ctx.input.programId, {
          affiliateId: ctx.input.affiliateId,
          approved: ctx.input.approved,
          coupon: ctx.input.coupon
        });
        break;
      case 'approve':
        result = await client.approveAffiliateForProgram(
          ctx.input.programId,
          ctx.input.affiliateId
        );
        break;
      case 'disapprove':
        result = await client.disapproveAffiliateForProgram(
          ctx.input.programId,
          ctx.input.affiliateId
        );
        break;
      case 'update':
        result = await client.updateAffiliateInProgram(
          ctx.input.programId,
          ctx.input.affiliateId,
          {
            coupon: ctx.input.coupon,
            approved: ctx.input.approved
          }
        );
        break;
    }

    return {
      output: {
        affiliateId: ctx.input.affiliateId,
        programId: ctx.input.programId,
        approved: result?.approved,
        coupon: result?.coupon
      },
      message: `${ctx.input.action === 'add' ? 'Added' : ctx.input.action === 'approve' ? 'Approved' : ctx.input.action === 'disapprove' ? 'Disapproved' : 'Updated'} affiliate \`${ctx.input.affiliateId}\` in program \`${ctx.input.programId}\`.`
    };
  })
  .build();

export let listProgramAffiliates = SlateTool.create(spec, {
  name: 'List Program Affiliates',
  key: 'list_program_affiliates',
  description: `List all affiliates enrolled in a specific program. Results are paginated (25 per page).`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      programId: z.string().describe('ID of the program'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      affiliates: z
        .array(
          z.object({
            affiliateId: z.string().describe('Affiliate ID'),
            approved: z.boolean().optional().describe('Approval status'),
            coupon: z.string().optional().describe('Assigned coupon code'),
            referralLink: z.any().optional().describe('Referral link for this program')
          })
        )
        .describe('List of affiliates in the program')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TapfiliateClient({ token: ctx.auth.token });
    let results = await client.listProgramAffiliates(ctx.input.programId, {
      page: ctx.input.page
    });

    let affiliates = results.map((r: any) => ({
      affiliateId: r.affiliate?.id || r.id,
      approved: r.approved,
      coupon: r.coupon,
      referralLink: r.referral_link
    }));

    return {
      output: { affiliates },
      message: `Found **${affiliates.length}** affiliate(s) in program \`${ctx.input.programId}\`.`
    };
  })
  .build();
