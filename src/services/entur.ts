/**
 * Entur Journey Planner API service
 * https://developer.entur.org/pages-journeyplanner-journeyplanner
 *
 * Free Norwegian transit API, no authentication required.
 * Requires ET-Client-Name header with company-app format.
 */

const API_ENDPOINT = 'https://api.entur.io/journey-planner/v3/graphql';
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
