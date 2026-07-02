import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let userKpiSchema = z.object({
  kpiId: z.number().describe('KPI identifier'),
  userId: z.number().describe('User identifier'),
  userTarget: z.number().nullable().describe('User-specific target override'),
  sortOrder: z.number().describe('Display order on KPI entry screen'),
  createdAt: z.string().nullable().describe('Assignment creation timestamp (UTC)'),
  updatedAt: z.string().nullable().describe('Last update timestamp (UTC)')
});

export let listUserKpis = SlateTool.create(spec, {
  name: 'List User KPI Assignments',
  key: 'list_user_kpis',
  description: `Retrieve all KPIs assigned to a specific user, including user-specific targets and sort order.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z.number().describe('ID of the user to list KPI assignments for')
    })
  )
  .output(
    z.object({
      assignments: z.array(userKpiSchema).describe('KPIs assigned to the user')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let kpis = await client.listUserKpis(ctx.input.userId);

    let mapped = (Array.isArray(kpis) ? kpis : []).map((k: any) => ({
      kpiId: k.id,
      userId: k.user_id,
      userTarget: k.user_target ?? null,
      sortOrder: k.sort_order,
      createdAt: k.created_at ?? null,
      updatedAt: k.updated_at ?? null
    }));

    return {
      output: { assignments: mapped },
      message: `User **${ctx.input.userId}** has **${mapped.length}** KPI assignments.`
    };
  })
  .build();

export let assignKpiToUser = SlateTool.create(spec, {
  name: 'Assign KPI to User',
  key: 'assign_kpi_to_user',
  description: `Assign a KPI to a user. This determines which KPIs the user can enter data against and analyze. Optionally set a user-specific target that overrides the KPI's default target.`
})
  .input(
    z.object({
      userId: z.number().describe('ID of the user to assign the KPI to'),
      kpiId: z.number().describe('ID of the KPI to assign'),
      sortOrder: z.number().describe('Display order on KPI entry screen'),
      userTarget: z
        .number()
        .optional()
        .nullable()
        .describe('User-specific target (overrides KPI default)')
    })
  )
  .output(
    z.object({
      kpiId: z.number().describe('Assigned KPI ID'),
      userId: z.number().describe('User ID'),
      userTarget: z.number().nullable().describe('User-specific target'),
      sortOrder: z.number().describe('Display order')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let result = await client.assignKpiToUser(ctx.input.userId, {
      id: ctx.input.kpiId,
      user_target: ctx.input.userTarget,
      sort_order: ctx.input.sortOrder
    });

    return {
      output: {
        kpiId: result.id,
        userId: result.user_id,
        userTarget: result.user_target ?? null,
        sortOrder: result.sort_order
      },
      message: `Assigned KPI **${ctx.input.kpiId}** to user **${ctx.input.userId}**.`
    };
  })
  .build();

export let removeKpiFromUser = SlateTool.create(spec, {
  name: 'Remove KPI from User',
  key: 'remove_kpi_from_user',
  description: `Remove a KPI assignment from a user. The user will no longer be able to enter data against or analyze this KPI.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      userId: z.number().describe('ID of the user'),
      kpiId: z.number().describe('ID of the KPI to remove from the user')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the removal was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    await client.removeKpiFromUser(ctx.input.userId, ctx.input.kpiId);

    return {
      output: { success: true },
      message: `Removed KPI **${ctx.input.kpiId}** from user **${ctx.input.userId}**.`
    };
  })
  .build();
