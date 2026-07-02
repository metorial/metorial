export interface RadiationWeatherParams {
  latitude: number;
  longitude: number;
  outputParameters?: string[];
  period?: string;
  hours?: number;
  tilt?: number;
  azimuth?: number;
  arrayType?: string;
  terrainShading?: boolean;
  format?: string;
}

export interface HistoricParams extends RadiationWeatherParams {
  start: string;
  end?: string;
  duration?: string;
  timeZone?: string;
}

export interface RooftopPvParams {
  latitude: number;
  longitude: number;
  capacity: number;
  tilt?: number;
  azimuth?: number;
  installDate?: string;
  lossFactor?: number;
  outputParameters?: string[];
  period?: string;
  hours?: number;
  terrainShading?: boolean;
  format?: string;
}

export interface HistoricRooftopPvParams extends RooftopPvParams {
  start: string;
  end?: string;
  duration?: string;
  timeZone?: string;
}

export interface AdvancedPvParams {
  resourceId: string;
  outputParameters?: string[];
  period?: string;
  hours?: number;
  applyAvailability?: boolean;
  applyConstraint?: boolean;
  applyDustSoiling?: boolean;
  applySnowSoiling?: boolean;
  applyTrackerInactive?: boolean;
  terrainShading?: boolean;
  format?: string;
}

export interface HistoricAdvancedPvParams extends AdvancedPvParams {
  start: string;
  end?: string;
  duration?: string;
  timeZone?: string;
}

export interface TmyRadiationWeatherParams {
  latitude: number;
  longitude: number;
  outputParameters?: string[];
  period?: string;
  timeZone?: string;
  ghiWeight?: number;
  dniWeight?: number;
  probability?: string;
  tilt?: number;
  azimuth?: number;
  arrayType?: string;
  terrainShading?: boolean;
  format?: string;
}

export interface TmyRooftopPvParams {
  latitude: number;
  longitude: number;
  capacity: number;
  tilt?: number;
  azimuth?: number;
  installDate?: string;
  lossFactor?: number;
  outputParameters?: string[];
  period?: string;
  timeZone?: string;
  ghiWeight?: number;
  dniWeight?: number;
  probability?: string;
  terrainShading?: boolean;
  format?: string;
}

export interface TmyAdvancedPvParams {
  resourceId: string;
  outputParameters?: string[];
  period?: string;
  timeZone?: string;
  ghiWeight?: number;
  dniWeight?: number;
  probability?: string;
  applyAvailability?: boolean;
  applyConstraint?: boolean;
  applyDustSoiling?: boolean;
  applySnowSoiling?: boolean;
  applyTrackerInactive?: boolean;
  terrainShading?: boolean;
  format?: string;
}

export interface AggregationParams {
  collectionId?: string;
  aggregationId?: string;
  outputParameters?: string[];
  hours?: number;
  period?: string;
  format?: string;
}

export interface HorizonAngleParams {
  latitude: number;
  longitude: number;
  azimuthIntervals: number;
  format?: string;
}

export interface PvPowerSiteCreateParams {
  name: string;
  latitude: number;
  longitude: number;
  capacity: number;
  capacityDc?: number;
  azimuth?: number;
  tilt?: number;
  trackingType?: string;
  installDate?: string;
  gridExportLimit?: number;
  moduleType?: string;
  groundCoverageRatio?: number;
  deratingTempModule?: number;
  deratingAgeSystem?: number;
  deratingInverterEfficiency?: number;
  terrainSlope?: number;
  terrainAzimuth?: number;
  dustSoilingAverage?: number[];
  bifacialSystemEnabled?: boolean;
  siteTag?: string;
  confirmOverwrite?: string;
}

export interface PvPowerSiteUpdateParams {
  resourceId: string;
  name?: string;
  latitude?: number;
  longitude?: number;
  capacity?: number;
  capacityDc?: number;
  azimuth?: number;
  tilt?: number;
  trackingType?: string;
  installDate?: string;
  gridExportLimit?: number;
  moduleType?: string;
  groundCoverageRatio?: number;
  deratingTempModule?: number;
  deratingAgeSystem?: number;
  deratingInverterEfficiency?: number;
  terrainSlope?: number;
  terrainAzimuth?: number;
  dustSoilingAverage?: number[];
  bifacialSystemEnabled?: boolean;
  siteTag?: string;
}

export interface PvPowerSitesListParams {
  entitlement?: string;
  showAll?: boolean;
  start?: number;
  end?: number;
  query?: string;
}

export interface HistoricForecastRadiationParams {
  latitude: number;
  longitude: number;
  start: string;
  end?: string;
  duration?: string;
  timeZone?: string;
  period?: string;
  leadTime?: string;
  tilt?: number;
  azimuth?: number;
  arrayType?: string;
  outputParameters?: string[];
  terrainShading?: boolean;
  format?: string;
}

export interface HistoricForecastRooftopPvParams {
  latitude: number;
  longitude: number;
  capacity: number;
  start: string;
  end?: string;
  duration?: string;
  timeZone?: string;
  period?: string;
  tilt?: number;
  azimuth?: number;
  installDate?: string;
  lossFactor?: number;
  outputParameters?: string[];
  terrainShading?: boolean;
  format?: string;
}
