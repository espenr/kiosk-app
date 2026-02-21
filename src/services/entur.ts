/**
 * Entur Journey Planner API service
 * https://developer.entur.org/pages-journeyplanner-journeyplanner
 *
 * Free Norwegian transit API, no authentication required.
 * Requires ET-Client-Name header with company-app format.
 */

const API_ENDPOINT = 'https://api.entur.io/journey-planner/v3/graphql';
const GEOCODER_ENDPOINT = 'https://api.entur.io/geocoder/v2/autocomplete';
const CLIENT_NAME = 'espen-kioskapp';

export interface Departure {
  line: string;
  lineName: string;
  destination: string;
  scheduledTime: Date;
  expectedTime: Date;
  isRealtime: boolean;
  quayName?: string;
}

export interface StopPlaceSuggestion {
  id: string; // NSR:StopPlace:XXXXX
  name: string; // "Planetringen"
  label: string; // "Planetringen, Malvik"
  locality: string; // "Malvik"
  coordinates: {
    latitude: number;
    longitude: number;
  };
  distance?: number; // km from focus point
  categories: string[];
}

interface EnturEstimatedCall {
  expectedDepartureTime: string;
  aimedDepartureTime: string;
  realtime: boolean;
  destinationDisplay: {
    frontText: string;
  };
  serviceJourney: {
    line: {
      publicCode: string;
      name: string;
      transportMode: string;
    };
  };
  quay: {
    name: string;
  };
}

interface EnturStopPlaceResponse {
  data: {
    stopPlace: {
      id: string;
      name: string;
      estimatedCalls: EnturEstimatedCall[];
    };
  };
}

/**
 * GraphQL query for stop departures
 */
const DEPARTURES_QUERY = `
query GetDepartures($stopPlaceId: String!, $numberOfDepartures: Int!) {
  stopPlace(id: $stopPlaceId) {
    id
    name
    estimatedCalls(numberOfDepartures: $numberOfDepartures) {
      expectedDepartureTime
      aimedDepartureTime
      realtime
      destinationDisplay {
        frontText
      }
      serviceJourney {
        line {
          publicCode
          name
          transportMode
        }
      }
      quay {
        name
      }
    }
  }
}
`;

/**
 * Fetch departures from a stop place
 */
export async function fetchDepartures(
  stopPlaceId: string,
  numberOfDepartures: number = 10
): Promise<Departure[]> {
  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'ET-Client-Name': CLIENT_NAME,
    },
    body: JSON.stringify({
      query: DEPARTURES_QUERY,
      variables: {
        stopPlaceId,
        numberOfDepartures,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Entur API error: ${response.status} ${response.statusText}`);
  }

  const result: EnturStopPlaceResponse = await response.json();

  if (!result.data?.stopPlace?.estimatedCalls) {
    return [];
  }

  return result.data.stopPlace.estimatedCalls.map((call) => ({
    line: call.serviceJourney.line.publicCode,
    lineName: call.serviceJourney.line.name,
    destination: call.destinationDisplay.frontText,
    scheduledTime: new Date(call.aimedDepartureTime),
    expectedTime: new Date(call.expectedDepartureTime),
    isRealtime: call.realtime,
    quayName: call.quay.name,
  }));
}

/**
 * Fetch departures from multiple stop places and merge results
 */
export async function fetchDeparturesFromMultipleStops(
  stopPlaceIds: string[],
  numberOfDepartures: number = 5
): Promise<Departure[]> {
  const allDepartures = await Promise.all(
    stopPlaceIds.map((id) => fetchDepartures(id, numberOfDepartures))
  );

  // Merge and sort by expected time
  const merged = allDepartures.flat();
  merged.sort((a, b) => a.expectedTime.getTime() - b.expectedTime.getTime());

  return merged;
}

/**
 * Format time until departure in Norwegian
 */
export function formatTimeUntil(departure: Date): string {
  const now = new Date();
  const diffMs = departure.getTime() - now.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 0) {
    return 'Nå';
  }
  if (diffMinutes === 0) {
    return 'Nå';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} min`;
  }

  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  return `${hours}t ${minutes}m`;
}

/**
 * Format departure time as HH:MM
 */
export function formatDepartureTime(date: Date): string {
  return new Intl.DateTimeFormat('nb-NO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

interface GeocoderFeature {
  properties: {
    id: string;
    name: string;
    label: string;
    locality?: string;
    distance?: number;
    category?: string[];
  };
  geometry: {
    coordinates: [number, number];
  };
}

interface GeocoderResponse {
  features?: GeocoderFeature[];
}

/**
 * Search for stop places by name using Entur Geocoder API
 */
export async function searchStopPlaces(
  query: string,
  focusPoint?: { latitude: number; longitude: number }
): Promise<StopPlaceSuggestion[]> {
  const url = new URL(GEOCODER_ENDPOINT);
  url.searchParams.set('text', query);
  url.searchParams.set('size', '20');
  url.searchParams.set('lang', 'no');
  url.searchParams.set('layers', 'venue');

  if (focusPoint) {
    url.searchParams.set('focus.point.lat', focusPoint.latitude.toString());
    url.searchParams.set('focus.point.lon', focusPoint.longitude.toString());
  }

  const response = await fetch(url.toString(), {
    headers: {
      'ET-Client-Name': CLIENT_NAME,
    },
  });

  if (!response.ok) {
    throw new Error(`Geocoder API error: ${response.status} ${response.statusText}`);
  }

  const result: GeocoderResponse = await response.json();

  if (!result.features || !Array.isArray(result.features)) {
    return [];
  }

  return result.features.map((feature) => ({
    id: feature.properties.id,
    name: feature.properties.name,
    label: feature.properties.label,
    locality: feature.properties.locality || '',
    coordinates: {
      latitude: feature.geometry.coordinates[1],
      longitude: feature.geometry.coordinates[0],
    },
    distance: feature.properties.distance,
    categories: feature.properties.category || [],
  }));
}

/**
 * Get stop place name by ID
 */
export async function getStopPlaceName(stopPlaceId: string): Promise<string> {
  const query = `
    query GetStopPlace($id: String!) {
      stopPlace(id: $id) {
        id
        name
      }
    }
  `;

  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'ET-Client-Name': CLIENT_NAME,
    },
    body: JSON.stringify({
      query,
      variables: { id: stopPlaceId },
    }),
  });

  if (!response.ok) {
    throw new Error(`Entur API error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();

  if (!result.data?.stopPlace?.name) {
    throw new Error('Stop place not found');
  }

  return result.data.stopPlace.name;
}
