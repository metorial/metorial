import { SlateTool } from 'slates';
import { z } from 'zod';
import { FlowiseClient, parseFlowiseList } from '../lib/client';
import { paginationOutputShape, paginationShape } from '../lib/schemas';
import { spec } from '../spec';

export let listVariables = SlateTool.create(spec, {
  name: 'List Variables',
  key: 'list_variables',
  description: `Retrieve all runtime variables configured in Flowise. Variables can be passed into flows at execution time via overrideConfig.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(z.object({ ...paginationShape }))
  .output(
    z.object({
      ...paginationOutputShape,
      variables: z
        .array(
          z.object({
            variableId: z.string().describe('Unique variable ID'),
            name: z.string().describe('Variable name'),
            value: z.string().optional().nullable().describe('Variable value'),
            type: z.string().optional().describe('Variable mode: static or runtime'),
            createdDate: z.string().optional().describe('ISO 8601 creation date'),
            updatedDate: z.string().optional().describe('ISO 8601 last update date')
          })
        )
        .describe('List of runtime variables')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FlowiseClient({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let result = await client.listVariables(ctx.input);
    let { items: variables, ...pagination } = parseFlowiseList(result, ctx.input);

    return {
      output: {
        ...pagination,
        variables: variables.map((v: any) => ({
          variableId: v.id,
          name: v.name,
          value: v.value,
          type: v.type,
          createdDate: v.createdDate,
          updatedDate: v.updatedDate
        }))
      },
      message: `Found **${variables.length}** variable(s).`
    };
  })
  .build();
