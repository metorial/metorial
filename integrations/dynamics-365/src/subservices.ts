export let dynamicsSubservices = [
  {
    key: 'dataverse',
    displayName: 'Dataverse',
    apiFamily: 'dataverse',
    authFamily: 'dataverse'
  },
  {
    key: 'sales',
    displayName: 'Sales',
    apiFamily: 'dataverse',
    authFamily: 'dataverse'
  },
  {
    key: 'customer_service',
    displayName: 'Customer Service',
    apiFamily: 'dataverse',
    authFamily: 'dataverse'
  },
  {
    key: 'field_service',
    displayName: 'Field Service',
    apiFamily: 'dataverse',
    authFamily: 'dataverse'
  },
  {
    key: 'contact_center',
    displayName: 'Contact Center',
    apiFamily: 'dataverse',
    authFamily: 'dataverse'
  },
  {
    key: 'customer_insights',
    displayName: 'Customer Insights',
    apiFamily: 'dataverse',
    authFamily: 'dataverse'
  },
  {
    key: 'finance',
    displayName: 'Finance',
    apiFamily: 'finance_and_operations',
    authFamily: 'finance_and_operations'
  },
  {
    key: 'supply_chain',
    displayName: 'Supply Chain',
    apiFamily: 'finance_and_operations',
    authFamily: 'finance_and_operations'
  },
  {
    key: 'project_operations',
    displayName: 'Project Operations',
    apiFamily: 'dataverse_and_finance_and_operations',
    authFamily: 'dataverse_and_finance_and_operations'
  },
  {
    key: 'commerce',
    displayName: 'Commerce',
    apiFamily: 'commerce_retail_server',
    authFamily: 'commerce_retail_server'
  },
  {
    key: 'human_resources',
    displayName: 'Human Resources',
    apiFamily: 'finance_and_operations',
    authFamily: 'finance_and_operations'
  },
  {
    key: 'business_central',
    displayName: 'Business Central',
    apiFamily: 'business_central',
    authFamily: 'business_central'
  }
] as const;

export type DynamicsSubserviceKey = (typeof dynamicsSubservices)[number]['key'];

export let dynamicsOauthAuthMethods = ['oauth_common', 'oauth_organizations'] as const;

export let dynamicsMicrosoftAuthMethods = [
  ...dynamicsOauthAuthMethods,
  'microsoft_client_credentials'
] as const;

export let dynamicsCommerceAuthMethods = [
  'microsoft_client_credentials',
  'commerce_access_token'
] as const;

export type DynamicsAuthMethodId =
  | (typeof dynamicsMicrosoftAuthMethods)[number]
  | (typeof dynamicsOauthAuthMethods)[number]
  | (typeof dynamicsCommerceAuthMethods)[number];

export let dynamicsAuthMethodsBySubserviceKey: Record<
  DynamicsSubserviceKey,
  readonly DynamicsAuthMethodId[]
> = {
  dataverse: dynamicsMicrosoftAuthMethods,
  sales: dynamicsMicrosoftAuthMethods,
  customer_service: dynamicsMicrosoftAuthMethods,
  field_service: dynamicsMicrosoftAuthMethods,
  contact_center: dynamicsMicrosoftAuthMethods,
  customer_insights: dynamicsMicrosoftAuthMethods,
  finance: dynamicsMicrosoftAuthMethods,
  supply_chain: dynamicsMicrosoftAuthMethods,
  project_operations: dynamicsMicrosoftAuthMethods,
  commerce: dynamicsCommerceAuthMethods,
  human_resources: dynamicsMicrosoftAuthMethods,
  business_central: dynamicsOauthAuthMethods
};

export let dynamicsSubserviceByKey = new Map(
  dynamicsSubservices.map(subservice => [subservice.key, subservice])
);

let sortedSubservicePrefixes = [...dynamicsSubservices]
  .map(subservice => subservice.key)
  .sort((left, right) => right.length - left.length);

let titleCase = (value: string) =>
  value
    .split('_')
    .filter(Boolean)
    .map(word => word.slice(0, 1).toUpperCase() + word.slice(1))
    .join(' ');

export let getSubserviceForActionKey = (key: string) => {
  let prefix = sortedSubservicePrefixes.find(candidate => key.startsWith(`${candidate}_`));
  return prefix ? dynamicsSubserviceByKey.get(prefix) : undefined;
};

export let getAuthMethodsForActionKey = (
  key: string
): readonly DynamicsAuthMethodId[] | undefined => {
  if (key === 'project_operations_manage_project_schedule') {
    return dynamicsOauthAuthMethods;
  }

  let subservice = getSubserviceForActionKey(key);
  return subservice ? dynamicsAuthMethodsBySubserviceKey[subservice.key] : undefined;
};

export let relabelDynamicsAction = <T>(action: T, key: string): T => {
  let mutable = action as T & {
    _params?: {
      key?: string;
      name?: string;
      description?: string;
      authMethods?: string[];
    };
    description?: string;
  };
  let subservice = getSubserviceForActionKey(key);
  if (!subservice || !mutable._params) return action;

  let suffix = key.slice(subservice.key.length + 1);
  let description = mutable._params.description ?? mutable.description ?? '';
  let authMethods = getAuthMethodsForActionKey(key);
  mutable._params = {
    ...mutable._params,
    key,
    name: `${subservice.displayName}: ${titleCase(suffix)}`,
    description: `${subservice.displayName}: ${description}`,
    authMethods: authMethods ? [...authMethods] : mutable._params.authMethods
  };

  return action;
};
