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
  homeId: string | null;
  realTimeEnabled: boolean;
  current: PriceInfo | null;
  today: PriceInfo[];
  tomorrow: PriceInfo[];
}

export interface LiveMeasurement {
  timestamp: Date;
  power: number; // Current consumption in Watts
  accumulatedConsumption: number; // kWh since midnight
  accumulatedCost: number | null; // Cost since midnight
  currency: string;
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
        id: string;
        features: {
          realTimeConsumptionEnabled: boolean;
        };
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
 * GraphQL query for electricity prices and home ID
 */
const PRICE_QUERY = `
{
  viewer {
    homes {
      id
      features {
        realTimeConsumptionEnabled
      }
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
    homeId: home.id || null,
    realTimeEnabled: home.features?.realTimeConsumptionEnabled || false,
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

/**
 * WebSocket subscription for live measurements from Tibber Pulse
 * Uses graphql-transport-ws protocol
 */
const WS_ENDPOINT = 'wss://websocket-api.tibber.com/v1-beta/gql/subscriptions';

const LIVE_MEASUREMENT_SUBSCRIPTION = `
subscription LiveMeasurement($homeId: ID!) {
  liveMeasurement(homeId: $homeId) {
    timestamp
    power
    accumulatedConsumption
    accumulatedCost
    currency
  }
}
`;

export type LiveMeasurementCallback = (measurement: LiveMeasurement) => void;
export type ErrorCallback = (error: string) => void;

export class TibberLiveConnection {
  private ws: WebSocket | null = null;
  private token: string;
  private homeId: string;
  private onMeasurement: LiveMeasurementCallback;
  private onError: ErrorCallback;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    token: string,
    homeId: string,
    onMeasurement: LiveMeasurementCallback,
    onError: ErrorCallback
  ) {
    this.token = token;
    this.homeId = homeId;
    this.onMeasurement = onMeasurement;
    this.onError = onError;
  }

  connect() {
    if (this.ws) {
      this.disconnect();
    }

    try {
      this.ws = new WebSocket(WS_ENDPOINT, 'graphql-transport-ws');

      this.ws.onopen = () => {
        // Send connection init with token
        this.ws?.send(JSON.stringify({
          type: 'connection_init',
          payload: { token: this.token },
        }));
      };

      this.ws.onmessage = (event) => {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case 'connection_ack':
            // Connection acknowledged, send subscription
            this.ws?.send(JSON.stringify({
              id: '1',
              type: 'subscribe',
              payload: {
                query: LIVE_MEASUREMENT_SUBSCRIPTION,
                variables: { homeId: this.homeId },
              },
            }));
            this.reconnectAttempts = 0;
            break;

          case 'next':
            // Received data
            if (message.payload?.data?.liveMeasurement) {
              const data = message.payload.data.liveMeasurement;
              this.onMeasurement({
                timestamp: new Date(data.timestamp),
                power: data.power,
                accumulatedConsumption: data.accumulatedConsumption,
                accumulatedCost: data.accumulatedCost,
                currency: data.currency || 'NOK',
              });
            }
            break;

          case 'error':
            this.onError(message.payload?.message || 'WebSocket error');
            break;

          case 'complete':
            // Subscription completed
            break;
        }
      };

      this.ws.onerror = () => {
        this.onError('WebSocket connection error');
      };

      this.ws.onclose = () => {
        this.ws = null;
        this.scheduleReconnect();
      };
    } catch (err) {
      this.onError(err instanceof Error ? err.message : 'Failed to connect');
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.onError('Max reconnection attempts reached');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
