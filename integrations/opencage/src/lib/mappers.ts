import type { GeocodeResult, ResultAnnotations } from './types';

export interface MappedAnnotations {
  timezone?: {
    name?: string;
    offsetSec?: number;
    offsetString?: string;
    shortName?: string;
    nowInDst?: boolean;
  };
  currency?: {
    name?: string;
    isoCode?: string;
    symbol?: string;
  };
  callingCode?: number;
  flag?: string;
  geohash?: string;
  qibla?: number;
  what3words?: string;
  dms?: {
    lat?: string;
    lng?: string;
  };
  mgrs?: string;
  maidenhead?: string;
  mercator?: {
    x?: number;
    y?: number;
  };
  sun?: {
    rise?: {
      apparent?: number;
      astronomical?: number;
      civil?: number;
      nautical?: number;
    };
    set?: {
      apparent?: number;
      astronomical?: number;
      civil?: number;
      nautical?: number;
    };
  };
  roadinfo?: {
    driveOn?: string;
    road?: string;
    roadType?: string;
    speedIn?: string;
  };
  osm?: {
    editUrl?: string;
    noteUrl?: string;
    url?: string;
  };
}

export interface MappedGeocodeResult {
  formatted: string;
  latitude: number;
  longitude: number;
  confidence: number;
  components: Record<string, string | number>;
  iso3166SubdivisionCodes?: string[];
  distanceFromQueryMeters?: number;
  bounds?: {
    northeast: { lat: number; lng: number };
    southwest: { lat: number; lng: number };
  };
  annotations?: MappedAnnotations;
}

export let mapAnnotations = (ann: ResultAnnotations): MappedAnnotations => {
  return {
    timezone: ann.timezone
      ? {
          name: ann.timezone.name,
          offsetSec: ann.timezone.offset_sec,
          offsetString: ann.timezone.offset_string,
          shortName: ann.timezone.short_name,
          nowInDst:
            ann.timezone.now_in_dst !== undefined ? ann.timezone.now_in_dst === 1 : undefined
        }
      : undefined,
    currency: ann.currency
      ? {
          name: ann.currency.name,
          isoCode: ann.currency.iso_code,
          symbol: ann.currency.symbol
        }
      : undefined,
    callingCode: ann.callingcode,
    flag: ann.flag,
    geohash: ann.geohash,
    qibla: ann.qibla,
    what3words: ann.what3words?.words,
    dms: ann.DMS ? { lat: ann.DMS.lat, lng: ann.DMS.lng } : undefined,
    mgrs: ann.MGRS,
    maidenhead: ann.Maidenhead,
    mercator: ann.Mercator ? { x: ann.Mercator.x, y: ann.Mercator.y } : undefined,
    sun: ann.sun ? { rise: ann.sun.rise, set: ann.sun.set } : undefined,
    roadinfo: ann.roadinfo
      ? {
          driveOn: ann.roadinfo.drive_on,
          road: ann.roadinfo.road,
          roadType: ann.roadinfo.road_type,
          speedIn: ann.roadinfo.speed_in
        }
      : undefined,
    osm: ann.OSM
      ? {
          editUrl: ann.OSM.edit_url,
          noteUrl: ann.OSM.note_url,
          url: ann.OSM.url
        }
      : undefined
  };
};

export let mapGeocodeResult = (r: GeocodeResult): MappedGeocodeResult => {
  let subdivisionCodes = r.components['ISO_3166-2'];
  return {
    formatted: r.formatted,
    latitude: r.geometry.lat,
    longitude: r.geometry.lng,
    confidence: r.confidence,
    components: Object.fromEntries(
      Object.entries(r.components).map(([key, value]) => [
        key,
        Array.isArray(value) ? value.join(', ') : value
      ])
    ),
    iso3166SubdivisionCodes: Array.isArray(subdivisionCodes) ? subdivisionCodes : undefined,
    distanceFromQueryMeters: r.distance_from_q?.meters,
    bounds: r.bounds,
    annotations: r.annotations ? mapAnnotations(r.annotations) : undefined
  };
};
