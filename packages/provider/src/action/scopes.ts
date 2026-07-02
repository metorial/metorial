import { SlateDeclarationError } from '../error';
import type { SlateActionScopeClause, SlateActionScopes } from './action';

export type SlateActionScopeValue = string;

export type SlateActionScopeClauseInput =
  | SlateActionScopeValue
  | readonly SlateActionScopeValue[]
  | SlateActionScopeClause;

export type SlateActionScopesInput = SlateActionScopeClauseInput | SlateActionScopes;

export let scopeClause = (...scopes: SlateActionScopeValue[]): SlateActionScopeClause => {
  assertScopeValues(scopes);
  return {
    OR: [...scopes]
  };
};

export let anyOf = (...scopes: SlateActionScopeValue[]): SlateActionScopes => ({
  AND: [scopeClause(...scopes)]
});

export let allOf = (...inputs: SlateActionScopesInput[]): SlateActionScopes => {
  let AND = inputs.flatMap(input => normalizeScopes(input).AND);
  return validateScopes({ AND });
};

export let mergeScopes = (
  ...inputs: Array<SlateActionScopes | null | undefined | false>
): SlateActionScopes | undefined => {
  let AND = inputs.flatMap(input => (input ? input.AND : []));
  if (AND.length === 0) {
    return undefined;
  }

  return validateScopes({ AND });
};

export let validateScopes = (scopes: SlateActionScopes): SlateActionScopes => {
  if (!Array.isArray(scopes.AND) || scopes.AND.length === 0) {
    throw new SlateDeclarationError('Action scopes must include at least one AND clause');
  }

  return {
    AND: scopes.AND.map(clause => normalizeClause(clause))
  };
};

let normalizeScopes = (input: SlateActionScopesInput): SlateActionScopes => {
  if (isScopes(input)) {
    return validateScopes(input);
  }

  return {
    AND: [normalizeClause(input)]
  };
};

let normalizeClause = (input: SlateActionScopeClauseInput): SlateActionScopeClause => {
  if (typeof input === 'string') {
    return scopeClause(input);
  }

  if (Array.isArray(input)) {
    return scopeClause(...input);
  }

  if (!isClause(input)) {
    throw new SlateDeclarationError('Action scope clauses must be strings or OR clauses');
  }

  assertScopeValues(input.OR);
  return {
    OR: [...input.OR]
  };
};

let assertScopeValues = (scopes: readonly SlateActionScopeValue[]) => {
  if (scopes.length === 0) {
    throw new SlateDeclarationError(
      'Each action scope clause must include at least one OR scope'
    );
  }

  for (let scope of scopes) {
    if (typeof scope !== 'string' || scope.trim().length === 0) {
      throw new SlateDeclarationError('Action scopes must be non-empty strings');
    }
  }
};

let isClause = (value: unknown): value is SlateActionScopeClause =>
  typeof value === 'object' &&
  value !== null &&
  'OR' in value &&
  Array.isArray((value as SlateActionScopeClause).OR);

let isScopes = (value: unknown): value is SlateActionScopes =>
  typeof value === 'object' &&
  value !== null &&
  'AND' in value &&
  Array.isArray((value as SlateActionScopes).AND);
