import { SlateTool } from 'slates';
import { z } from 'zod';
import {
  createDynamicsClient,
  dataverseAlternateKeySchema,
  inferBindingType,
  recordKeyFromInput
} from '../lib/client';
import { spec } from '../spec';

export let invokeFunction = SlateTool.create(spec, {
  name: 'Invoke Function',
  key: 'invoke_function',
  description: `Invoke an unbound or bound Dataverse function in Dynamics 365. Functions are read-only operations that return data without side effects. Common functions include **WhoAmI**, **RetrieveCurrentOrganization**, and **RetrieveTotalRecordCount**.`,
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
        .describe('Function parameters as key-value pairs'),
      bindingType: z
        .enum(['unbound', 'entity', 'collection'])
        .optional()
        .describe(
          'Whether the function is unbound, bound to a record, or bound to an entity set'
        ),
      namespace: z
        .string()
        .optional()
        .describe('Namespace for bound operations; defaults to Microsoft.Dynamics.CRM'),
      entitySetName: z.string().optional().describe('Entity set name for bound functions'),
      recordId: z.string().optional().describe('GUID for entity-bound functions'),
      alternateKey: dataverseAlternateKeySchema
        .optional()
        .describe('Alternate key values for entity-bound functions when recordId is omitted')
    })
  )
  .output(
    z.object({
      functionName: z.string().describe('Function invoked'),
      bindingType: z
        .enum(['unbound', 'entity', 'collection'])
        .describe('Binding variant used'),
      result: z.any().describe('Function return value')
    })
  )
  .handleInvocation(async ctx => {
    let client = createDynamicsClient(ctx);
    let bindingType = inferBindingType(ctx.input);

    let result = await client.invokeOperation({
      operationType: 'function',
      bindingType,
      operationName: ctx.input.functionName,
      namespace: ctx.input.namespace,
      entitySetName: ctx.input.entitySetName,
      recordKey:
        bindingType === 'entity'
          ? recordKeyFromInput({
              recordId: ctx.input.recordId,
              alternateKey: ctx.input.alternateKey
            })
          : undefined,
      parameters: ctx.input.parameters
    });

    return {
      output: {
        functionName: ctx.input.functionName,
        bindingType,
        result
      },
      message: `Invoked function **${ctx.input.functionName}** successfully.`
    };
  })
  .build();

export let invokeAction = SlateTool.create(spec, {
  name: 'Invoke Action',
  key: 'invoke_action',
  description: `Invoke a bound or unbound Dataverse action in Dynamics 365. Actions may have side effects and can modify data. Supports built-in actions (for example, **QualifyLead**, **CloseIncident**) and custom actions.`,
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
      bindingType: z
        .enum(['unbound', 'entity', 'collection'])
        .optional()
        .describe(
          'Whether the action is unbound, bound to a record, or bound to an entity set'
        ),
      namespace: z
        .string()
        .optional()
        .describe('Namespace for bound operations; defaults to Microsoft.Dynamics.CRM'),
      entitySetName: z
        .string()
        .optional()
        .describe('Entity set name for bound actions (e.g., "leads")'),
      recordId: z.string().optional().describe('GUID of the record for entity-bound actions'),
      alternateKey: dataverseAlternateKeySchema
        .optional()
        .describe('Alternate key values for entity-bound actions when recordId is omitted')
    })
  )
  .output(
    z.object({
      actionName: z.string().describe('Action invoked'),
      bindingType: z
        .enum(['unbound', 'entity', 'collection'])
        .describe('Binding variant used'),
      result: z.any().describe('Action return value (may be empty for void actions)')
    })
  )
  .handleInvocation(async ctx => {
    let client = createDynamicsClient(ctx);
    let bindingType = inferBindingType(ctx.input);

    let result = await client.invokeOperation({
      operationType: 'action',
      bindingType,
      operationName: ctx.input.actionName,
      namespace: ctx.input.namespace,
      entitySetName: ctx.input.entitySetName,
      recordKey:
        bindingType === 'entity'
          ? recordKeyFromInput({
              recordId: ctx.input.recordId,
              alternateKey: ctx.input.alternateKey
            })
          : undefined,
      requestBody: ctx.input.requestBody
    });

    return {
      output: {
        actionName: ctx.input.actionName,
        bindingType,
        result: result || {}
      },
      message: `Invoked action **${ctx.input.actionName}** successfully.`
    };
  })
  .build();
