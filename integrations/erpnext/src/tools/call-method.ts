import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let callMethod = SlateTool.create(spec, {
  name: 'Call Method',
  key: 'call_method',
  description: `Call a whitelisted server-side method on the ERPNext/Frappe backend via the RPC API. This enables access to custom business logic, report generation, and specialized operations beyond standard CRUD.`,
  instructions: [
    'The method path uses Python dotted notation (e.g., "frappe.client.get_list", "erpnext.stock.utils.get_stock_balance").',
    'Use POST for methods that modify data, GET for read-only methods.',
    'Parameters are passed as key-value pairs in the request body (POST) or query string (GET).'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      method: z
        .string()
        .describe('The dotted path to the server method (e.g., "frappe.client.get_list")'),
      httpMethod: z
        .enum(['GET', 'POST'])
        .optional()
        .describe('HTTP method to use. Defaults to POST.'),
      params: z
        .record(z.string(), z.any())
        .optional()
        .describe('Parameters to pass to the method')
    })
  )
  .output(
    z.object({
      result: z.any().describe('The response from the server method')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      siteUrl: ctx.config.siteUrl,
      token: ctx.auth.token
    });

    let result: any;
    if (ctx.input.httpMethod === 'GET') {
      result = await client.callGetMethod(ctx.input.method, ctx.input.params);
    } else {
      result = await client.callMethod(ctx.input.method, ctx.input.params);
    }

    return {
      output: { result },
      message: `Called method **${ctx.input.method}** successfully`
    };
  })
  .build();
