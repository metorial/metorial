import { resolveRegion } from './validation';

const regions = {
  us: { graphql: 'https://tray.io/graphql', rest: 'https://api.tray.io' },
  eu: { graphql: 'https://eu1.tray.io/graphql', rest: 'https://api.eu1.tray.io' },
  apac: { graphql: 'https://ap1.tray.io/graphql', rest: 'https://api.ap1.tray.io' }
};
export const getGraphqlUrl = (region: string): string =>
  regions[resolveRegion(region) as keyof typeof regions].graphql;
export const getRestBaseUrl = (region: string): string =>
  regions[resolveRegion(region) as keyof typeof regions].rest;
