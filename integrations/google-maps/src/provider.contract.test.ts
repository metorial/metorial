import { createLocalSlateTestClient, expectSlateContract } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';

describe('google-maps provider contract', () => {
  it('exposes the expected provider, tool, trigger, and auth surface', async () => {
    let client = createLocalSlateTestClient({ slate: provider });
    let contract = await expectSlateContract({
      client,
      provider: {
        id: 'google-maps',
        name: 'Google Maps'
      },
      toolIds: [
        'geocode',
        'validate_address',
        'search_places',
        'get_place_details',
        'get_directions',
        'compute_route_matrix',
        'get_elevation',
        'get_timezone',
        'get_air_quality',
        'snap_to_roads',
        'generate_static_map',
        'geolocate'
      ],
      triggerIds: ['inbound_webhook'],
      authMethodIds: ['api_key'],
      triggers: [{ id: 'inbound_webhook', invocationType: 'webhook' }]
    });

    expect(contract.actions).toHaveLength(13);

    for (let action of contract.actions) {
      expect(action.scopes).toBeUndefined();
    }
  });
});
