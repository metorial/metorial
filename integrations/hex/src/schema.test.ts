import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';
import legacy from './legacy-schemas.json';
import { spec } from './spec';

describeMcpCompatibleToolSchemas('Hex input schemas', provider.actions);
const record = (value: unknown) => z.record(z.string(), z.unknown()).parse(value);
const canonical = (value: unknown): unknown =>
  Array.isArray(value)
    ? value.map(canonical)
    : value && typeof value === 'object'
      ? Object.fromEntries(
          Object.entries(value)
            .filter(([key]) => !['description', '$schema'].includes(key))
            .map(([key, item]) => [key, canonical(item)])
        )
      : value;
// Current official DTOs omit these legacy required fields. Keep their schema properties
// optional rather than inventing identifiers, descriptions or timestamps.
const relaxed = new Set([
  'get_project.creator.userId',
  'get_project.creator.name',
  'get_project.owner.userId',
  'get_project.owner.name',
  'list_projects.projects[].creator.userId',
  'list_projects.projects[].creator.name',
  'list_projects.projects[].owner.userId',
  'list_projects.projects[].owner.name',
  'get_project.sharing.users[].userId',
  'get_project.sharing.groups[].groupId',
  'get_project.sharing.collections[].collectionId',
  'list_users.users[].createdAt',
  ...['description', 'createdAt', 'updatedAt'].flatMap(field => [
    `manage_collection.${field}`,
    `list_collections.collections[].${field}`,
    `get_data_connection.${field}`,
    `list_data_connections.connections[].${field}`
  ])
]);
function compatible(
  previousValue: unknown,
  currentValue: unknown,
  path: string,
  input: boolean
) {
  const previous = record(previousValue),
    current = record(currentValue);
  for (const [key, value] of Object.entries(previous)) {
    if (key === 'properties') {
      const fields = record(current.properties);
      for (const [field, schema] of Object.entries(record(value)))
        compatible(schema, fields[field], `${path}.${field}`, input);
    } else if (key === 'items') compatible(value, current.items, `${path}[]`, input);
    else if (key === 'anyOf' || key === 'oneOf' || key === 'allOf') {
      const previousBranches = z.array(z.unknown()).parse(value),
        currentBranches = z.array(z.unknown()).parse(current[key]);
      expect(currentBranches).toHaveLength(previousBranches.length);
      previousBranches.forEach((branch, index) =>
        compatible(branch, currentBranches[index], path, input)
      );
    } else if (key === 'required') {
      const oldRequired = z.array(z.string()).parse(value),
        newRequired =
          current.required === undefined ? [] : z.array(z.string()).parse(current.required);
      for (const field of oldRequired)
        if (input || !relaxed.has(`${path}.${field}`)) expect(newRequired).toContain(field);
      if (input) for (const field of newRequired) expect(oldRequired).toContain(field);
    } else if (key === 'enum' && input) {
      for (const option of z.array(z.unknown()).parse(value))
        expect(current.enum).toContainEqual(option);
    } else if (key === 'type' && !input && path === 'list_users.users[].name') {
      expect(value).toBe('string');
      expect(current.anyOf).toEqual([{ type: 'string' }, { type: 'null' }]);
    } else expect(current[key]).toEqual(value);
  }
  if (input && previous.required === undefined) expect(current.required ?? []).toEqual([]);
}
it.each(
  Object.entries(legacy)
)('preserves historical %s contracts with documented DTO relaxations', (key, schemas) => {
  const action = provider.actions.find(candidate => candidate.key === key);
  expect(action).toBeDefined();
  compatible(
    schemas.input,
    canonical(z.toJSONSchema(action?.inputSchema as z.ZodType)),
    key,
    true
  );
  compatible(
    schemas.output,
    canonical(z.toJSONSchema(action?.outputSchema as z.ZodType)),
    key,
    false
  );
});
it('retains raw keys, short production IDs and legacy authentication/configuration', () => {
  expect(provider.actions).toHaveLength(24);
  expect(new Set(provider.actions.map(action => action.key)).size).toBe(24);
  for (const action of provider.actions) expect(`hex-${action.key}`.length).toBeLessThan(60);
  const stored = { token: 'schema-only-token' };
  expect(spec.authSchema.parse(stored)).toEqual(stored);
  const deployment = { baseUrl: 'https://eu.hex.tech' };
  expect(spec.configSchema.parse(deployment)).toEqual(deployment);
  expect(z.toJSONSchema(spec.configSchema).properties).not.toHaveProperty('baseUrl');
  expect(
    spec.authSchema.parse({ ...stored, ...deployment, workspaceId: 'schema-only-workspace' })
  ).toEqual({ ...stored, ...deployment, workspaceId: 'schema-only-workspace' });
});
