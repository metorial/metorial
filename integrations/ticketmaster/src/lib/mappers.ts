export let mapEvent = (event: any) => {
  if (!event) return null;

  let venue = event._embedded?.venues?.[0];
  let attractions = event._embedded?.attractions;

  return {
    eventId: event.id || '',
    name: event.name || '',
    type: event.type || '',
    url: event.url || '',
    locale: event.locale || '',
    description: event.description || event.info || '',
    pleaseNote: event.pleaseNote || '',
    startDate: event.dates?.start?.dateTime || event.dates?.start?.localDate || '',
    startLocalDate: event.dates?.start?.localDate || '',
    startLocalTime: event.dates?.start?.localTime || '',
    startDateTBD: event.dates?.start?.dateTBD || false,
    startDateTBA: event.dates?.start?.dateTBA || false,
    startTimeTBA: event.dates?.start?.timeTBA || false,
    endDate: event.dates?.end?.dateTime || event.dates?.end?.localDate || '',
    timezone: event.dates?.timezone || '',
    statusCode: event.dates?.status?.code || '',
    spanMultipleDays: event.dates?.spanMultipleDays || false,
    priceRanges: (event.priceRanges || []).map((pr: any) => ({
      type: pr.type || '',
      currency: pr.currency || '',
      min: pr.min ?? null,
      max: pr.max ?? null
    })),
    seatmap: event.seatmap?.staticUrl || '',
    ticketLimit: event.ticketLimit?.info || '',
    ageRestrictions: event.ageRestrictions?.legalAgeEnforced || false,
    accessibility: event.accessibility?.info || '',
    images: (event.images || []).map((img: any) => ({
      url: img.url || '',
      width: img.width ?? null,
      height: img.height ?? null,
      ratio: img.ratio || ''
    })),
    sales: {
      publicStartDateTime: event.sales?.public?.startDateTime || '',
      publicEndDateTime: event.sales?.public?.endDateTime || '',
      publicStartTBD: event.sales?.public?.startTBD || false,
      presales: (event.sales?.presales || []).map((ps: any) => ({
        name: ps.name || '',
        startDateTime: ps.startDateTime || '',
        endDateTime: ps.endDateTime || ''
      }))
    },
    classifications: (event.classifications || []).map((c: any) => ({
      primary: c.primary || false,
      segmentName: c.segment?.name || '',
      segmentId: c.segment?.id || '',
      genreName: c.genre?.name || '',
      genreId: c.genre?.id || '',
      subGenreName: c.subGenre?.name || '',
      subGenreId: c.subGenre?.id || '',
      typeName: c.type?.name || '',
      subTypeName: c.subType?.name || ''
    })),
    promoter: event.promoter
      ? {
          promoterId: event.promoter.id || '',
          name: event.promoter.name || '',
          description: event.promoter.description || ''
        }
      : null,
    venue: venue
      ? {
          venueId: venue.id || '',
          name: venue.name || '',
          url: venue.url || '',
          city: venue.city?.name || '',
          stateCode: venue.state?.stateCode || '',
          stateName: venue.state?.name || '',
          countryCode: venue.country?.countryCode || '',
          countryName: venue.country?.name || '',
          postalCode: venue.postalCode || '',
          address: venue.address?.line1 || '',
          latitude: venue.location?.latitude || '',
          longitude: venue.location?.longitude || '',
          timezone: venue.timezone || ''
        }
      : null,
    attractions: (attractions || []).map((a: any) => ({
      attractionId: a.id || '',
      name: a.name || '',
      url: a.url || '',
      classifications: (a.classifications || []).map((c: any) => ({
        segmentName: c.segment?.name || '',
        genreName: c.genre?.name || ''
      }))
    }))
  };
};

export let mapAttraction = (attraction: any) => {
  if (!attraction) return null;

  return {
    attractionId: attraction.id || '',
    name: attraction.name || '',
    type: attraction.type || '',
    url: attraction.url || '',
    locale: attraction.locale || '',
    upcomingEvents: attraction.upcomingEvents || {},
    externalLinks: attraction.externalLinks || {},
    images: (attraction.images || []).map((img: any) => ({
      url: img.url || '',
      width: img.width ?? null,
      height: img.height ?? null,
      ratio: img.ratio || ''
    })),
    classifications: (attraction.classifications || []).map((c: any) => ({
      primary: c.primary || false,
      segmentName: c.segment?.name || '',
      segmentId: c.segment?.id || '',
      genreName: c.genre?.name || '',
      genreId: c.genre?.id || '',
      subGenreName: c.subGenre?.name || '',
      subGenreId: c.subGenre?.id || ''
    })),
    aliases: attraction.aliases || []
  };
};

export let mapVenue = (venue: any) => {
  if (!venue) return null;

  return {
    venueId: venue.id || '',
    name: venue.name || '',
    type: venue.type || '',
    url: venue.url || '',
    locale: venue.locale || '',
    city: venue.city?.name || '',
    stateCode: venue.state?.stateCode || '',
    stateName: venue.state?.name || '',
    countryCode: venue.country?.countryCode || '',
    countryName: venue.country?.name || '',
    postalCode: venue.postalCode || '',
    address: venue.address?.line1 || '',
    addressLine2: venue.address?.line2 || '',
    latitude: venue.location?.latitude || '',
    longitude: venue.location?.longitude || '',
    timezone: venue.timezone || '',
    parkingDetail: venue.parkingDetail || '',
    accessibleSeatingDetail: venue.accessibleSeatingDetail || '',
    generalInfo: {
      generalRule: venue.generalInfo?.generalRule || '',
      childRule: venue.generalInfo?.childRule || ''
    },
    boxOfficeInfo: {
      phoneNumberDetail: venue.boxOfficeInfo?.phoneNumberDetail || '',
      openHoursDetail: venue.boxOfficeInfo?.openHoursDetail || '',
      acceptedPaymentDetail: venue.boxOfficeInfo?.acceptedPaymentDetail || '',
      willCallDetail: venue.boxOfficeInfo?.willCallDetail || ''
    },
    upcomingEvents: venue.upcomingEvents || {},
    images: (venue.images || []).map((img: any) => ({
      url: img.url || '',
      width: img.width ?? null,
      height: img.height ?? null,
      ratio: img.ratio || ''
    })),
    dmas: (venue.dmas || []).map((d: any) => ({ dmaId: String(d.id || '') })),
    social: venue.social || {}
  };
};

export let mapClassification = (classification: any) => {
  if (!classification) return null;

  return {
    segment: classification.segment
      ? {
          segmentId: classification.segment.id || '',
          name: classification.segment.name || ''
        }
      : null,
    genre: classification.genre
      ? {
          genreId: classification.genre.id || '',
          name: classification.genre.name || ''
        }
      : null,
    subGenre: classification.subGenre
      ? {
          subGenreId: classification.subGenre.id || '',
          name: classification.subGenre.name || ''
        }
      : null,
    type: classification.type
      ? {
          typeId: classification.type.id || '',
          name: classification.type.name || ''
        }
      : null,
    subType: classification.subType
      ? {
          subTypeId: classification.subType.id || '',
          name: classification.subType.name || ''
        }
      : null,
    primary: classification.primary || false
  };
};

export let mapPagination = (page: any) => {
  return {
    totalElements: page?.totalElements ?? 0,
    totalPages: page?.totalPages ?? 0,
    currentPage: page?.number ?? 0,
    pageSize: page?.size ?? 20
  };
};
