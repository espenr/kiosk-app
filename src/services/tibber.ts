/**
 * Tibber API service for electricity prices
 * https://developer.tibber.com/
 *
 * GraphQL API requiring Bearer token authentication.
 * Provides current price and 24-hour price forecast.
 */

const API_ENDPOINT = 'https://api.tibber.com/v1-beta/gql';

export type PriceLevel = 'VERY_CHEAP' | 'CHEAP' | 'NORMAL' | 'EXPENSIVE' | 'VERY_EXPENSIVE';

export interface PriceInfo {
  total: number; // NOK/kWh including all fees
  energy: number;
  tax: number;
  startsAt: Date;
  level: PriceLevel;
}

export interface ElectricityData {
  current: PriceInfo | null;
  today: PriceInfo[];
  tomorrow: PriceInfo[];
}

interface TibberPriceInfo {
  total: number;
  energy: number;
  tax: number;
  startsAt: string;
  level: PriceLevel;
}

interface TibberResponse {
  data: {
    viewer: {
      homes: Array<{
        currentSubscription: {
          priceInfo: {
            current: TibberPriceInfo | null;
            today: TibberPriceInfo[];
            tomorrow: TibberPriceInfo[];
          };
        };
      }>;
    };
  };
  errors?: Array<{ message: string }>;
}

/**
 * GraphQL query for electricity prices
 */
const PRICE_QUERY = `
{
  viewer {
    homes {
      currentSubscription {
        priceInfo {
          current {
            total
            energy
            tax
            startsAt
            level
          }
          today {
            total
            energy
            tax
            startsAt
            level
          }
          tomorrow {
            total
            energy
            tax
            startsAt
            level
          }
        }
      }
    }
  }
}
`;

/**
 * Fetch electricity prices from Tibber API
 */
export async function fetchElectricityPrices(token: string): Promise<ElectricityData> {
  if (!token) {
    throw new Error('Tibber API token er ikke konfigurert');
  }

  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ query: PRICE_QUERY }),
  });

  if (!response.ok) {
    throw new Error(`Tibber API error: ${response.status} ${response.statusText}`);
  }

  const result: TibberResponse = await response.json();

  if (result.errors && result.errors.length > 0) {
    throw new Error(result.errors[0].message);
  }

  const home = result.data?.viewer?.homes?.[0];
  if (!home?.currentSubscription?.priceInfo) {
    throw new Error('Ingen prisdata tilgjengelig');
  }

  const priceInfo = home.currentSubscription.priceInfo;

  return {
    current: priceInfo.current ? parsePriceInfo(priceInfo.current) : null,
    today: priceInfo.today.map(parsePriceInfo),
    tomorrow: priceInfo.tomorrow.map(parsePriceInfo),
  };
}

function parsePriceInfo(price: TibberPriceInfo): PriceInfo {
  return {
    total: price.total,
    energy: price.energy,
    tax: price.tax,
    startsAt: new Date(price.startsAt),
    level: price.level,
  };
}

/**
 * Get color for price level
 */
export function getPriceLevelColor(level: PriceLevel): string {
  switch (level) {
    case 'VERY_CHEAP':
      return '#22c55e'; // green-500
    case 'CHEAP':
      return '#84cc16'; // lime-500
    case 'NORMAL':
      return '#eab308'; // yellow-500
    case 'EXPENSIVE':
      return '#f97316'; // orange-500
    case 'VERY_EXPENSIVE':
      return '#ef4444'; // red-500
    default:
      return '#6b7280'; // gray-500
  }
}

/**
 * Get background color class for price level
 */
export function getPriceLevelBgClass(level: PriceLevel): string {
  switch (level) {
    case 'VERY_CHEAP':
      return 'bg-green-500';
    case 'CHEAP':
      return 'bg-lime-500';
    case 'NORMAL':
      return 'bg-yellow-500';
    case 'EXPENSIVE':
      return 'bg-orange-500';
    case 'VERY_EXPENSIVE':
      return 'bg-red-500';
    default:
      return 'bg-gray-500';
  }
}

/**
 * Format price in NOK
 */
export function formatPrice(price: number): string {
  return price.toFixed(2);
}
