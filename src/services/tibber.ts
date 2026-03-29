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
 * Grid fee rate configuration (day/night)
 */
export interface GridFeeRate {
  day: number;   // Day rate (06:00-22:00) in kr/kWh
  night: number; // Night rate (22:00-06:00) in kr/kWh
}

/**
 * Check if a given time falls within day period (06:00-22:00)
 */
export function isDayPeriod(date: Date = new Date()): boolean {
  const hour = date.getHours();
  return hour >= 6 && hour < 22;
}

/**
 * Get the applicable grid fee for a given time
 */
export function getGridFee(gridFeeRate: GridFeeRate, date: Date = new Date()): number {
  return isDayPeriod(date) ? gridFeeRate.day : gridFeeRate.night;
}

/**
 * Get grid fee period name for display
 */
export function getGridFeePeriod(date: Date = new Date()): 'day' | 'night' {
  return isDayPeriod(date) ? 'day' : 'night';
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

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  OPEN = 'open',
  SUBSCRIBED = 'subscribed',
  DATA_FLOWING = 'data_flowing',
  STALE = 'stale',
  ERROR = 'error',
}

export type StateChangeCallback = (state: ConnectionState) => void;

export class TibberLiveConnection {
  private ws: WebSocket | null = null;
  private token: string;
  private homeId: string;
  private onMeasurement: LiveMeasurementCallback;
  private onError: ErrorCallback;
  private onStateChange: StateChangeCallback;
  private reconnectAttempts = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private lastMessageTime: number = 0;
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private stateTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(
    token: string,
    homeId: string,
    onMeasurement: LiveMeasurementCallback,
    onError: ErrorCallback,
    onStateChange: StateChangeCallback
  ) {
    this.token = token;
    this.homeId = homeId;
    this.onMeasurement = onMeasurement;
    this.onError = onError;
    this.onStateChange = onStateChange;
  }

  private transitionToState(newState: ConnectionState, reason?: string) {
    if (this.connectionState === newState) return;

    console.log(`[Tibber] State: ${this.connectionState} → ${newState}${reason ? ` (${reason})` : ''}`);
    this.connectionState = newState;
    this.onStateChange(newState);

    // Log connection failures for debugging (Phase 1.3)
    if (newState === ConnectionState.ERROR || newState === ConnectionState.DISCONNECTED) {
      const nextDelay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      console.log(`[Tibber] Connection failed: ${reason || 'unknown reason'}, attempt #${this.reconnectAttempts}, next delay: ${nextDelay}ms`);
    }

    // Clear existing timeout
    if (this.stateTimeoutId) {
      clearTimeout(this.stateTimeoutId);
      this.stateTimeoutId = null;
    }

    // Set timeout for hanging states (Phase 1.2: increased timeouts for reliability)
    const timeouts = {
      [ConnectionState.CONNECTING]: 25000,   // 15s → 25s (more time to establish WebSocket)
      [ConnectionState.OPEN]: 25000,         // 15s → 25s (more time for auth/connection_ack)
      [ConnectionState.SUBSCRIBED]: 40000,   // 30s → 40s (more time for first data)
    };

    if (newState in timeouts) {
      this.stateTimeoutId = setTimeout(() => {
        console.warn(`[Tibber] Timeout in ${newState} state, forcing reconnect`);
        this.transitionToState(ConnectionState.ERROR, `timeout in ${newState}`);
        this.forceReconnect();
      }, timeouts[newState as keyof typeof timeouts]);
    }
  }

  private safeSend(message: object): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[Tibber] Cannot send message, WebSocket not ready (state: ' +
        (this.ws?.readyState ?? 'null') + ')');
      return false;
    }

    try {
      this.ws.send(JSON.stringify(message));
      return true;
    } catch (err) {
      console.error('[Tibber] Send failed:', err);
      return false;
    }
  }

  connect() {
    if (this.ws) {
      this.disconnect();
    }

    try {
      this.transitionToState(ConnectionState.CONNECTING);
      this.ws = new WebSocket(WS_ENDPOINT, 'graphql-transport-ws');

      this.ws.onopen = () => {
        this.transitionToState(ConnectionState.OPEN, 'WebSocket opened');
        // Send connection init with token
        this.safeSend({
          type: 'connection_init',
          payload: { token: this.token },
        });
      };

      this.ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        this.lastMessageTime = Date.now();

        switch (message.type) {
          case 'connection_ack':
            this.transitionToState(ConnectionState.SUBSCRIBED, 'connection_ack received');
            // Connection acknowledged, send subscription
            this.safeSend({
              id: '1',
              type: 'subscribe',
              payload: {
                query: LIVE_MEASUREMENT_SUBSCRIPTION,
                variables: { homeId: this.homeId },
              },
            });
            this.reconnectAttempts = 0;
            break;

          case 'next':
            // Received data
            if (message.payload?.data?.liveMeasurement) {
              this.transitionToState(ConnectionState.DATA_FLOWING, 'first measurement received');
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
            this.transitionToState(ConnectionState.ERROR, message.payload?.message);
            this.onError(message.payload?.message || 'WebSocket error');
            break;

          case 'complete':
            // Subscription completed
            break;
        }
      };

      this.ws.onerror = () => {
        this.transitionToState(ConnectionState.ERROR, 'WebSocket error');
        this.onError('WebSocket connection error');
      };

      this.ws.onclose = () => {
        this.transitionToState(ConnectionState.DISCONNECTED, 'WebSocket closed');
        this.ws = null;
        this.scheduleReconnect();
      };
    } catch (err) {
      this.onError(err instanceof Error ? err.message : 'Failed to connect');
    }
  }

  private scheduleReconnect() {
    // Remove max reconnection attempts - always retry with exponential backoff
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

    if (this.stateTimeoutId) {
      clearTimeout(this.stateTimeoutId);
      this.stateTimeoutId = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  getLastMessageTime(): number {
    return this.lastMessageTime;
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  forceReconnect() {
    console.log('[Tibber] Force reconnecting due to stale data');
    this.transitionToState(ConnectionState.STALE, 'data stale, forcing reconnect');
    this.reconnectAttempts = 0; // Reset counter
    this.disconnect();
    this.connect();
  }
}
