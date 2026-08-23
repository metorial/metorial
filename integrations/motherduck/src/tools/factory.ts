import { SlateTool } from 'slates';
import type { z } from 'zod';
import { createMotherDuckClient } from '../lib/client';
import { spec } from '../spec';
import { getMotherDuckInvocationNotice, invokeMotherDuckTool } from './native';

export type MotherDuckToolContract = {
  key: string;
  name: string;
  description: string;
  inputSchema: z.ZodObject<any>;
  outputSchema: z.ZodObject<any>;
  tags: { readOnly?: boolean; destructive?: boolean };
};

export let createMotherDuckTool = (contract: MotherDuckToolContract) =>
  SlateTool.create(spec, {
    key: contract.key,
    name: contract.name,
    description: contract.description,
    tags: contract.tags
  })
    .input(contract.inputSchema)
    .output(contract.outputSchema)
    .handleInvocation(async ctx => {
      let client = createMotherDuckClient(ctx.auth.token, ctx.auth.region);
      let output = await invokeMotherDuckTool(
        client,
        contract.key,
        ctx.input as Record<string, unknown>
      );
      return {
        output,
        message: getMotherDuckInvocationNotice(output) ?? `${contract.name} completed.`
      };
    })
    .build();
