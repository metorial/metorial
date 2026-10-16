import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';

describeMcpCompatibleToolSchemas('Foursquare tool input schemas', provider.actions);

let replacements = {
  search_places: 'search_places_current',
  get_place_details: 'get_place_details_current',
  autocomplete_places: 'autocomplete_places_current',
  match_place: 'match_place_current',
  get_place_photos: 'get_place_photos_current',
  get_place_tips: 'get_place_tips_current',
  find_nearby_places: 'get_geotagging_candidates',
  submit_place_feedback: 'suggest_place_changes',
  get_feedback_status: 'get_suggestion_status'
};

describe('Legacy V3 deprecation contracts', () => {
  for (let [oldKey, newKey] of Object.entries(replacements)) {
    it(`preserves ${oldKey} and its replacement ${newKey}`, () => {
      let legacy = provider.actions.find(action => action.key === oldKey);
      let replacement = provider.actions.find(action => action.key === newKey);
      expect(legacy).toBeDefined();
      expect(replacement).toBeDefined();
      expect(legacy?.tags?.deprecated).toBe(true);
      expect(legacy?.description).toContain(`DEPRECATED — use \`${newKey}\` instead.`);
      expect(legacy?.instructions?.some(value => value.includes(newKey))).toBe(true);
    });
  }
});
