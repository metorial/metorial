import { createApiServiceError } from 'slates';

export let mapEvent = (event: any) => {
  if (!event) return null;
  if (typeof event.id !== 'string' || !event.id) {
    throw createApiServiceError('Ticketmaster returned a event without an ID.', {
      reason: 'invalid_discovery_response'
    });
  }

  let venue = event._embedded?.venues?.[0];
  let attractions = event._embedded?.attractions;

  return {
    eventId: event.id ?? undefined,
    name: event.name ?? undefined,
    type: event.type ?? undefined,
    url: event.url ?? undefined,
    locale: event.locale ?? undefined,
    description: event.description ?? event.info ?? undefined,
    pleaseNote: event.pleaseNote ?? undefined,
    startDate: event.dates?.start?.dateTime ?? event.dates?.start?.localDate ?? undefined,
    startLocalDate: event.dates?.start?.localDate ?? undefined,
    startLocalTime: event.dates?.start?.localTime ?? undefined,
    startDateTBD: event.dates?.start?.dateTBD ?? undefined,
    startDateTBA: event.dates?.start?.dateTBA ?? undefined,
    startTimeTBA: event.dates?.start?.timeTBA ?? undefined,
    endDate: event.dates?.end?.dateTime ?? event.dates?.end?.localDate ?? undefined,
    timezone: event.dates?.timezone ?? undefined,
    statusCode: event.dates?.status?.code ?? undefined,
    spanMultipleDays: event.dates?.spanMultipleDays ?? undefined,
    priceRanges: (event.priceRanges || []).map((pr: any) => ({
      type: pr.type ?? undefined,
      currency: pr.currency ?? undefined,
      min: pr.min ?? null,
      max: pr.max ?? null
    })),
    seatmap: event.seatmap?.staticUrl ?? undefined,
    ticketLimit: event.ticketLimit?.info ?? undefined,
    ageRestrictions: event.ageRestrictions?.legalAgeEnforced ?? undefined,
    accessibility: event.accessibility?.info ?? undefined,
    images: (event.images || []).map((img: any) => ({
      url: img.url ?? undefined,
      width: img.width ?? null,
      height: img.height ?? null,
      ratio: img.ratio ?? undefined
    })),
    sales: {
      publicStartDateTime: event.sales?.public?.startDateTime ?? undefined,
      publicEndDateTime: event.sales?.public?.endDateTime ?? undefined,
      publicStartTBD: event.sales?.public?.startTBD ?? undefined,
      presales: (event.sales?.presales || []).map((ps: any) => ({
        name: ps.name ?? undefined,
        startDateTime: ps.startDateTime ?? undefined,
        endDateTime: ps.endDateTime ?? undefined
      }))
    },
    classifications: (event.classifications || []).map((c: any) => ({
      primary: c.primary ?? undefined,
      segmentName: c.segment?.name ?? undefined,
      segmentId: c.segment?.id ?? undefined,
      genreName: c.genre?.name ?? undefined,
      genreId: c.genre?.id ?? undefined,
      subGenreName: c.subGenre?.name ?? undefined,
      subGenreId: c.subGenre?.id ?? undefined,
      typeName: c.type?.name ?? undefined,
      subTypeName: c.subType?.name ?? undefined
    })),
    promoter: event.promoter
      ? {
          promoterId: event.promoter.id ?? undefined,
          name: event.promoter.name ?? undefined,
          description: event.promoter.description ?? undefined
        }
      : null,
    venue: venue
      ? {
          venueId: venue.id ?? undefined,
          name: venue.name ?? undefined,
          url: venue.url ?? undefined,
          city: venue.city?.name ?? undefined,
          stateCode: venue.state?.stateCode ?? undefined,
          stateName: venue.state?.name ?? undefined,
          countryCode: venue.country?.countryCode ?? undefined,
          countryName: venue.country?.name ?? undefined,
          postalCode: venue.postalCode ?? undefined,
          address: venue.address?.line1 ?? undefined,
          latitude:
            venue.location?.latitude == null ? undefined : String(venue.location.latitude),
          longitude:
            venue.location?.longitude == null ? undefined : String(venue.location.longitude),
          timezone: venue.timezone ?? undefined
        }
      : null,
    attractions: (attractions || []).map((a: any) => ({
      attractionId: a.id ?? undefined,
      name: a.name ?? undefined,
      url: a.url ?? undefined,
      classifications: (a.classifications || []).map((c: any) => ({
        segmentName: c.segment?.name ?? undefined,
        genreName: c.genre?.name ?? undefined
      }))
    }))
  };
};

export let mapAttraction = (attraction: any) => {
  if (!attraction) return null;
  if (typeof attraction.id !== 'string' || !attraction.id) {
    throw createApiServiceError('Ticketmaster returned a attraction without an ID.', {
      reason: 'invalid_discovery_response'
    });
  }

  return {
    attractionId: attraction.id ?? undefined,
    name: attraction.name ?? undefined,
    type: attraction.type ?? undefined,
    url: attraction.url ?? undefined,
    locale: attraction.locale ?? undefined,
    upcomingEvents: attraction.upcomingEvents || {},
    externalLinks: attraction.externalLinks || {},
    images: (attraction.images || []).map((img: any) => ({
      url: img.url ?? undefined,
      width: img.width ?? null,
      height: img.height ?? null,
      ratio: img.ratio ?? undefined
    })),
    classifications: (attraction.classifications || []).map((c: any) => ({
      primary: c.primary ?? undefined,
      segmentName: c.segment?.name ?? undefined,
      segmentId: c.segment?.id ?? undefined,
      genreName: c.genre?.name ?? undefined,
      genreId: c.genre?.id ?? undefined,
      subGenreName: c.subGenre?.name ?? undefined,
      subGenreId: c.subGenre?.id ?? undefined
    })),
    aliases: attraction.aliases || []
  };
};

export let mapVenue = (venue: any) => {
  if (!venue) return null;
  if (typeof venue.id !== 'string' || !venue.id) {
    throw createApiServiceError('Ticketmaster returned a venue without an ID.', {
      reason: 'invalid_discovery_response'
    });
  }

  return {
    venueId: venue.id ?? undefined,
    name: venue.name ?? undefined,
    type: venue.type ?? undefined,
    url: venue.url ?? undefined,
    locale: venue.locale ?? undefined,
    city: venue.city?.name ?? undefined,
    stateCode: venue.state?.stateCode ?? undefined,
    stateName: venue.state?.name ?? undefined,
    countryCode: venue.country?.countryCode ?? undefined,
    countryName: venue.country?.name ?? undefined,
    postalCode: venue.postalCode ?? undefined,
    address: venue.address?.line1 ?? undefined,
    addressLine2: venue.address?.line2 ?? undefined,
    latitude: venue.location?.latitude == null ? undefined : String(venue.location.latitude),
    longitude:
      venue.location?.longitude == null ? undefined : String(venue.location.longitude),
    timezone: venue.timezone ?? undefined,
    parkingDetail: venue.parkingDetail ?? undefined,
    accessibleSeatingDetail: venue.accessibleSeatingDetail ?? undefined,
    generalInfo: {
      generalRule: venue.generalInfo?.generalRule ?? undefined,
      childRule: venue.generalInfo?.childRule ?? undefined
    },
    boxOfficeInfo: {
      phoneNumberDetail: venue.boxOfficeInfo?.phoneNumberDetail ?? undefined,
      openHoursDetail: venue.boxOfficeInfo?.openHoursDetail ?? undefined,
      acceptedPaymentDetail: venue.boxOfficeInfo?.acceptedPaymentDetail ?? undefined,
      willCallDetail: venue.boxOfficeInfo?.willCallDetail ?? undefined
    },
    upcomingEvents: venue.upcomingEvents || {},
    images: (venue.images || []).map((img: any) => ({
      url: img.url ?? undefined,
      width: img.width ?? null,
      height: img.height ?? null,
      ratio: img.ratio ?? undefined
    })),
    dmas: (venue.dmas ?? venue.dma ?? []).map((d: any) => ({
      dmaId: d.id == null ? undefined : String(d.id)
    })),
    social: venue.social || {}
  };
};

export let mapClassification = (classification: any) => {
  if (!classification) return null;

  return {
    segment: classification.segment
      ? {
          segmentId: classification.segment.id ?? undefined,
          name: classification.segment.name ?? undefined
        }
      : null,
    genre: classification.genre
      ? {
          genreId: classification.genre.id ?? undefined,
          name: classification.genre.name ?? undefined
        }
      : null,
    subGenre: classification.subGenre
      ? {
          subGenreId: classification.subGenre.id ?? undefined,
          name: classification.subGenre.name ?? undefined
        }
      : null,
    type: classification.type
      ? {
          typeId: classification.type.id ?? undefined,
          name: classification.type.name ?? undefined
        }
      : null,
    subType: classification.subType
      ? {
          subTypeId: classification.subType.id ?? undefined,
          name: classification.subType.name ?? undefined
        }
      : null,
    primary: classification.primary ?? undefined
  };
};

export let mapPagination = (page: any) => {
  return {
    totalElements: page?.totalElements ?? undefined,
    totalPages: page?.totalPages ?? undefined,
    currentPage: page?.number ?? undefined,
    pageSize: page?.size ?? undefined
  };
};
