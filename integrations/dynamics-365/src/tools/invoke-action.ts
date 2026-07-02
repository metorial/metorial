import { SlateTool } from 'slates';
import { z } from 'zod';
import { DynamicsClient } from '../lib/client';
import { resolveDynamicsInstanceUrl } from '../lib/resolve-instance-url';
import { spec } from '../spec';

export let invokeFunction = SlateTool.create(spec, {
  name: 'Invoke Function',
  key: 'invoke_function',
  description: `Invoke an unbound function in Dynamics 365. Functions are read-only operations that return data without side effects. Common functions include **WhoAmI**, **RetrieveCurrentOrganization**, and **RetrieveTotalRecordCount**.`,
  instructions: [
    'Functions are invoked via GET and do not modify data.',
    'Parameters are passed as function parameters in the URL, e.g., WhoAmI() requires no parameters.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      functionName: z
        .string()
        .describe(
          'Name of the function to invoke (e.g., "WhoAmI", "RetrieveCurrentOrganization")'
        ),
      parameters: z
        .record(z.string(), z.any())
        .optional()
        .describe('Function parameters as key-value pairs')
    })
  )
  .output(
    z.object({
      result: z.record(z.string(), z.any()).describe('Function return value')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DynamicsClient({
      token: ctx.auth.token,
      instanceUrl: resolveDynamicsInstanceUrl(ctx)
    });

    let result = await client.invokeUnboundFunction(
      ctx.input.functionName,
      ctx.input.parameters
    );

    return {
      output: { result },
      message: `Invoked function **${ctx.input.functionName}** successfully.`
    };
  })
  .build();

export let invokeAction = SlateTool.create(spec, {
  name: 'Invoke Action',
  key: 'invoke_action',
  description: `Invoke a bound or unbound action in Dynamics 365. Actions may have side effects and can modify data. Supports both built-in actions (e.g., **QualifyLead**, **CloseIncident**) and custom actions. For bound actions, specify the entity and record ID.`,
  instructions: [
    'For unbound actions, only provide the actionName and optional requestBody.',
    'For bound actions, also provide entitySetName and recordId. The action will be invoked on the specific record.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      actionName: z
        .string()
        .describe(
          'Name of the action to invoke (e.g., "QualifyLead", "CloseIncident", or a custom action name)'
        ),
      requestBody: z
        .record(z.string(), z.any())
        .optional()
        .describe('Action request parameters'),
      entitySetName: z
        .string()
        .optional()
        .describe('Entity set name for bound actions (e.g., "leads")'),
      recordId: z.string().optional().describe('GUID of the record for bound actions')
    })
  )
  .output(
    z.object({
      result: z.any().describe('Action return value (may be empty for void actions)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DynamicsClient({
      token: ctx.auth.token,
      instanceUrl: resolveDynamicsInstanceUrl(ctx)
    });

    let result: any;
    if (ctx.input.entitySetName && ctx.input.recordId) {
      result = await client.invokeBoundAction(
        ctx.input.entitySetName,
        ctx.input.recordId,
        ctx.input.actionName,
        ctx.input.requestBody
      );
    } else {
      result = await client.invokeUnboundAction(ctx.input.actionName, ctx.input.requestBody);
    }

    return {
      output: { result: result || {} },
      message: `Invoked action **${ctx.input.actionName}** successfully.`
    };
  })
  .build();
