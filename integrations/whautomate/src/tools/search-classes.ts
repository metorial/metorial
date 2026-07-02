import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchClasses = SlateTool.create(spec, {
  name: 'Search Classes',
  key: 'search_classes',
  description: `Search group classes or get a specific class by ID. Filter by date range, location, staff, and service. Also supports retrieving all class bookings for a specific client.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      classId: z.string().optional().describe('Get a specific class by ID'),
      clientId: z.string().optional().describe('Get all class bookings for a specific client'),
      fromDate: z.string().optional().describe('Start date filter (YYYY-MM-DD)'),
      toDate: z.string().optional().describe('End date filter (YYYY-MM-DD)'),
      locationId: z.string().optional().describe('Filter by location ID'),
      staffId: z.string().optional().describe('Filter by staff member ID'),
      serviceId: z.string().optional().describe('Filter by service ID'),
      page: z.number().optional().describe('Page number for pagination'),
      pageSize: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      classes: z.array(z.record(z.string(), z.any())).describe('Array of class records'),
      totalCount: z.number().optional().describe('Total number of matching classes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiHost: ctx.config.apiHost
    });

    if (ctx.input.classId) {
      let result = await client.getClass(ctx.input.classId);
      return {
        output: {
          classes: [result],
          totalCount: 1
        },
        message: `Found class **${ctx.input.classId}**.`
      };
    }

    if (ctx.input.clientId) {
      let result = await client.getClientClassBookings(ctx.input.clientId, {
        page: ctx.input.page,
        pageSize: ctx.input.pageSize
      });
      let classes = Array.isArray(result) ? result : result.bookings || result.data || [];
      return {
        output: {
          classes,
          totalCount: classes.length
        },
        message: `Found **${classes.length}** class booking(s) for client ${ctx.input.clientId}.`
      };
    }

    let result = await client.searchClasses({
      fromDate: ctx.input.fromDate,
      toDate: ctx.input.toDate,
      locationId: ctx.input.locationId,
      staffId: ctx.input.staffId,
      serviceId: ctx.input.serviceId,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    let classes = Array.isArray(result) ? result : result.classes || result.data || [];
    let totalCount = result.totalCount || result.total || classes.length;

    return {
      output: {
        classes,
        totalCount
      },
      message: `Found **${totalCount}** class(es).`
    };
  })
  .build();
