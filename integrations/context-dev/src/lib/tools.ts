import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import contract from './contract.json';

export type OfficialToolName = keyof typeof contract;
export const officialContract = contract;
export const inputSchema = (name: OfficialToolName) => {
  const source = contract[name].inputSchema;
  // Validate and publish the same frozen contract. Zod otherwise rewrites singleton
  // enums to const and unconstrained objects to {}, creating spurious sync drift.
  return z
    .fromJSONSchema(source as z.core.JSONSchema.JSONSchema)
    .meta({ ...source, additionalProperties: true }) as z.ZodType<Record<string, any>>;
};

export const contextTool = (
  name: OfficialToolName,
  options: { description?: string; instructions?: string[] } = {}
) => {
  const upstream = contract[name];
  return SlateTool.create(spec, {
    key: name.replaceAll('-', '_'),
    name: name
      .split('-')
      .map(part => part[0]?.toUpperCase() + part.slice(1))
      .join(' '),
    description: options.description ?? upstream.description,
    instructions: options.instructions,
    tags: {
      readOnly: upstream.annotations.readOnlyHint,
      destructive: upstream.annotations.destructiveHint
    }
  }).input(inputSchema(name));
};
