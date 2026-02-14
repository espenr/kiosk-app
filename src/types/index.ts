// Weather types
export interface WeatherData {
  temperature: number;
  symbol: string; // Weather icon code
  description: string;
}

export interface DayForecast {
  date: Date;
  high: number;
  low: number;
  symbol: string;
}

// Calendar types
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  color?: string;
}

// Electricity types
export interface PriceInfo {
  total: number; // NOK/kWh including fees
  energy: number;
  tax: number;
  startsAt: Date;
  level: 'VERY_CHEAP' | 'CHEAP' | 'NORMAL' | 'EXPENSIVE' | 'VERY_EXPENSIVE';
}

export interface HourlyPrice {
  hour: number;
  price: number;
  level: PriceInfo['level'];
}

// Transport types
export interface Departure {
  line: string;
  destination: string;
  scheduledTime: Date;
  expectedTime: Date;
  isRealtime: boolean;
}

// Photo types
export interface Photo {
  url: string;
  width: number;
  height: number;
  caption?: string;
}
