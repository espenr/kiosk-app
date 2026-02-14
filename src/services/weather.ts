/**
 * Weather service using Met.no Locationforecast API
 * https://api.met.no/weatherapi/locationforecast/2.0/documentation
 *
 * Free Norwegian government API, no authentication required.
 * Requires User-Agent header with application name and contact.
 */

const API_BASE = 'https://api.met.no/weatherapi/locationforecast/2.0/compact';
const USER_AGENT = 'KioskApp/1.0 github.com/espenr/kiosk-app';

// Met.no API response types
interface MetNoTimeseries {
  time: string;
  data: {
    instant: {
      details: {
        air_temperature: number;
        wind_speed?: number;
        relative_humidity?: number;
      };
    };
    next_1_hours?: {
      summary: { symbol_code: string };
    };
    next_6_hours?: {
      summary: { symbol_code: string };
      details: {
        air_temperature_min: number;
        air_temperature_max: number;
      };
    };
    next_12_hours?: {
      summary: { symbol_code: string };
    };
  };
}

interface MetNoResponse {
  type: string;
  geometry: {
    type: string;
    coordinates: [number, number, number];
  };
  properties: {
    meta: {
      updated_at: string;
      units: Record<string, string>;
    };
    timeseries: MetNoTimeseries[];
  };
}

// Our simplified weather types
export interface CurrentWeather {
  temperature: number;
  symbol: string;
  updatedAt: Date;
}

export interface DayForecast {
  date: Date;
  dayName: string;
  high: number;
  low: number;
  symbol: string;
}

export interface WeatherData {
  current: CurrentWeather;
  forecast: DayForecast[];
}

/**
 * Fetch weather data from Met.no API
 */
export async function fetchWeather(
  latitude: number,
  longitude: number
): Promise<WeatherData> {
  const url = `${API_BASE}?lat=${latitude.toFixed(4)}&lon=${longitude.toFixed(4)}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error(`Weather API error: ${response.status} ${response.statusText}`);
  }

  const data: MetNoResponse = await response.json();
  return parseWeatherData(data);
}

/**
 * Parse Met.no response into our simplified format
 */
function parseWeatherData(data: MetNoResponse): WeatherData {
  const timeseries = data.properties.timeseries;

  if (!timeseries || timeseries.length === 0) {
    throw new Error('No weather data available');
  }

  // Current weather from first timeseries entry
  const now = timeseries[0];
  const current: CurrentWeather = {
    temperature: Math.round(now.data.instant.details.air_temperature),
    symbol: now.data.next_1_hours?.summary.symbol_code ||
            now.data.next_6_hours?.summary.symbol_code ||
            'cloudy',
    updatedAt: new Date(data.properties.meta.updated_at),
  };

  // Get 5-day forecast (today + 4 days)
  const forecast = getFiveDayForecast(timeseries);

  return { current, forecast };
}

/**
 * Extract 5-day forecast from timeseries
 */
function getFiveDayForecast(timeseries: MetNoTimeseries[]): DayForecast[] {
  const dayNames = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dailyData: Map<string, { temps: number[]; symbol: string; date: Date }> = new Map();

  // Group data by day
  for (const entry of timeseries) {
    const entryDate = new Date(entry.time);
    const dateKey = entryDate.toISOString().split('T')[0];

    if (!dailyData.has(dateKey)) {
      dailyData.set(dateKey, {
        temps: [],
        symbol: entry.data.next_6_hours?.summary.symbol_code ||
                entry.data.next_1_hours?.summary.symbol_code ||
                'cloudy',
        date: entryDate,
      });
    }

    const day = dailyData.get(dateKey)!;
    day.temps.push(entry.data.instant.details.air_temperature);

    // Prefer midday symbol (around 12:00)
    const hour = entryDate.getHours();
    if (hour >= 10 && hour <= 14) {
      day.symbol = entry.data.next_6_hours?.summary.symbol_code ||
                   entry.data.next_1_hours?.summary.symbol_code ||
                   day.symbol;
    }
  }

  // Convert to forecast array (5 days starting from today)
  const forecast: DayForecast[] = [];
  const sortedDays = Array.from(dailyData.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 5);

  for (const [, dayData] of sortedDays) {
    const temps = dayData.temps;
    forecast.push({
      date: dayData.date,
      dayName: dayNames[dayData.date.getDay()],
      high: Math.round(Math.max(...temps)),
      low: Math.round(Math.min(...temps)),
      symbol: dayData.symbol,
    });
  }

  return forecast;
}

/**
 * Get weather icon component based on symbol code
 * Met.no uses codes like: clearsky_day, partlycloudy_night, rain, etc.
 */
export function getWeatherEmoji(symbol: string): string {
  const base = symbol.split('_')[0]; // Remove _day/_night suffix

  const emojiMap: Record<string, string> = {
    clearsky: '☀️',
    fair: '🌤️',
    partlycloudy: '⛅',
    cloudy: '☁️',
    fog: '🌫️',
    lightrain: '🌦️',
    rain: '🌧️',
    heavyrain: '🌧️',
    lightrainshowers: '🌦️',
    rainshowers: '🌧️',
    heavyrainshowers: '🌧️',
    lightsleet: '🌨️',
    sleet: '🌨️',
    heavysleet: '🌨️',
    lightsnow: '🌨️',
    snow: '❄️',
    heavysnow: '❄️',
    lightsnowshowers: '🌨️',
    snowshowers: '❄️',
    heavysnowshowers: '❄️',
    thunder: '⛈️',
    lightrainandthunder: '⛈️',
    rainandthunder: '⛈️',
    heavyrainandthunder: '⛈️',
    lightsleetandthunder: '⛈️',
    sleetandthunder: '⛈️',
    lightssleetshowersandthunder: '⛈️',
    heavysleetshowersandthunder: '⛈️',
    lightsnowandthunder: '⛈️',
    snowandthunder: '⛈️',
    heavysnowandthunder: '⛈️',
  };

  return emojiMap[base] || '🌡️';
}
