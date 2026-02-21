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
        wind_from_direction?: number;
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

export interface HourlyForecast {
  time: Date;
  temperature: number;
  symbol: string;
  windSpeed: number;
  windDirection: number; // degrees, 0=north, 90=east, 180=south, 270=west
}

export interface WeatherData {
  current: CurrentWeather;
  forecast: DayForecast[];
  hourly: HourlyForecast[];
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

  // Get hourly forecast (next 10 hours, 2-hour intervals)
  const hourly = getHourlyForecast(timeseries);

  return { current, forecast, hourly };
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
 * Extract hourly forecast (next 8 hours, 2-hour intervals = 4 points)
 */
function getHourlyForecast(timeseries: MetNoTimeseries[]): HourlyForecast[] {
  const hourly: HourlyForecast[] = [];
  const now = new Date();

  // We want 4 points: +2h, +4h, +6h, +8h
  // Met.no provides hourly data, so we look for entries closest to these times
  const targetHours = [2, 4, 6, 8];

  for (const targetOffset of targetHours) {
    const targetTime = new Date(now.getTime() + targetOffset * 60 * 60 * 1000);

    // Find the closest timeseries entry
    let closestEntry = timeseries[0];
    let smallestDiff = Math.abs(new Date(timeseries[0].time).getTime() - targetTime.getTime());

    for (const entry of timeseries) {
      const entryTime = new Date(entry.time);
      const diff = Math.abs(entryTime.getTime() - targetTime.getTime());

      if (diff < smallestDiff) {
        smallestDiff = diff;
        closestEntry = entry;
      }

      // Stop if we've gone past the target time by more than 2 hours
      if (entryTime.getTime() - targetTime.getTime() > 2 * 60 * 60 * 1000) {
        break;
      }
    }

    hourly.push({
      time: new Date(closestEntry.time),
      temperature: Math.round(closestEntry.data.instant.details.air_temperature),
      symbol: closestEntry.data.next_1_hours?.summary.symbol_code ||
              closestEntry.data.next_6_hours?.summary.symbol_code ||
              'cloudy',
      windSpeed: closestEntry.data.instant.details.wind_speed || 0,
      windDirection: closestEntry.data.instant.details.wind_from_direction || 0,
    });
  }

  return hourly;
}

/**
 * Get wind direction arrow based on degrees
 * Wind direction is "from" direction, so arrow points "to" direction
 * @param degrees - 0=north, 90=east, 180=south, 270=west
 */
export function getWindArrow(degrees: number): string {
  // Normalize to 0-360
  const normalized = ((degrees % 360) + 360) % 360;

  // 8 directions, each covering 45 degrees
  // Arrow points TO where wind is blowing (opposite of FROM direction)
  if (normalized >= 337.5 || normalized < 22.5) return '↓';   // FROM North
  if (normalized >= 22.5 && normalized < 67.5) return '↙';    // FROM NE
  if (normalized >= 67.5 && normalized < 112.5) return '←';   // FROM East
  if (normalized >= 112.5 && normalized < 157.5) return '↖';  // FROM SE
  if (normalized >= 157.5 && normalized < 202.5) return '↑';  // FROM South
  if (normalized >= 202.5 && normalized < 247.5) return '↗';  // FROM SW
  if (normalized >= 247.5 && normalized < 292.5) return '→';  // FROM West
  return '↘'; // FROM NW
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
