/**
 * Time-grid layout utilities for calendar events
 * Handles positioning, overlap detection, and column assignment
 */

import { CalendarEvent } from '../../../../services/calendar';

// Grid configuration
export const GRID_START_HOUR = 7;   // 07:00
export const GRID_END_HOUR = 23;    // 23:00
export const TOTAL_HOURS = GRID_END_HOUR - GRID_START_HOUR; // 16 hours
export const GRID_HEIGHT = 488;     // px (total grid area height)
export const PX_PER_HOUR = GRID_HEIGHT / TOTAL_HOURS; // ~30.5px
export const MIN_EVENT_HEIGHT = 20; // px minimum for readability

export interface EventPosition {
  event: CalendarEvent;
  top: number;        // px from grid top
  height: number;     // px
  left: string;       // % from column left
  width: string;      // % width
  column: number;     // overlap column index
  maxColumns: number; // total columns in overlap group
  clippedStart: boolean; // event starts before visible range
  clippedEnd: boolean;   // event ends after visible range
}

/**
 * Convert time to pixel position from grid top
 */
export function timeToPixels(date: Date): number {
  const hour = date.getHours();
  const minute = date.getMinutes();
  const fractionalHour = hour + minute / 60;

  // Clamp to visible range
  const clampedHour = Math.max(
    GRID_START_HOUR,
    Math.min(GRID_END_HOUR, fractionalHour)
  );

  return (clampedHour - GRID_START_HOUR) * PX_PER_HOUR;
}

/**
 * Calculate event height based on start/end times
 */
export function calculateEventHeight(start: Date, end: Date): number {
  const startPx = timeToPixels(start);
  const endPx = timeToPixels(end);
  const height = endPx - startPx;

  return Math.max(MIN_EVENT_HEIGHT, height);
}

/**
 * Check if event is within visible time range
 */
export function isEventVisible(event: CalendarEvent): boolean {
  if (event.isAllDay) return false; // All-day events handled separately

  const startHour = event.start.getHours() + event.start.getMinutes() / 60;
  const endHour = event.end.getHours() + event.end.getMinutes() / 60;

  // Event is visible if it overlaps with visible range
  return endHour > GRID_START_HOUR && startHour < GRID_END_HOUR;
}

/**
 * Clip event to visible time range
 */
export function clipToVisibleRange(event: CalendarEvent): {
  event: CalendarEvent;
  clippedStart: boolean;
  clippedEnd: boolean;
} {
  const startHour = event.start.getHours() + event.start.getMinutes() / 60;
  const endHour = event.end.getHours() + event.end.getMinutes() / 60;

  let clippedStart = false;
  let clippedEnd = false;

  let newStart = event.start;
  let newEnd = event.end;

  // Clip start to grid start
  if (startHour < GRID_START_HOUR) {
    clippedStart = true;
    newStart = new Date(event.start);
    newStart.setHours(GRID_START_HOUR, 0, 0, 0);
  }

  // Clip end to grid end
  if (endHour > GRID_END_HOUR) {
    clippedEnd = true;
    newEnd = new Date(event.end);
    newEnd.setHours(GRID_END_HOUR, 0, 0, 0);
  }

  return {
    event: {
      ...event,
      start: newStart,
      end: newEnd,
    },
    clippedStart,
    clippedEnd,
  };
}

/**
 * Check if two events overlap in time
 */
export function eventsOverlap(a: CalendarEvent, b: CalendarEvent): boolean {
  return a.start < b.end && a.end > b.start;
}

/**
 * Calculate positions for all events with overlap detection
 * Uses column-based algorithm for side-by-side layout
 */
export function calculateEventPositions(events: CalendarEvent[]): EventPosition[] {
  // Filter to visible timed events and clip to range
  const visibleEvents = events
    .filter(isEventVisible)
    .map(clipToVisibleRange);

  if (visibleEvents.length === 0) return [];

  // Sort by start time, then duration (longest first)
  const sorted = [...visibleEvents].sort((a, b) => {
    if (a.event.start.getTime() !== b.event.start.getTime()) {
      return a.event.start.getTime() - b.event.start.getTime();
    }
    const durationA = a.event.end.getTime() - a.event.start.getTime();
    const durationB = b.event.end.getTime() - b.event.start.getTime();
    return durationB - durationA; // Longest first
  });

  // Assign columns using greedy algorithm
  const positions: EventPosition[] = [];
  const columnEnds: Date[] = []; // Track when each column becomes available

  for (const { event, clippedStart, clippedEnd } of sorted) {
    // Find first available column (where previous event has ended)
    let column = 0;
    while (column < columnEnds.length && columnEnds[column] > event.start) {
      column++;
    }

    // Calculate position
    const top = timeToPixels(event.start);
    const height = calculateEventHeight(event.start, event.end);

    positions.push({
      event,
      top,
      height,
      column,
      maxColumns: 0, // Will be calculated in next step
      left: '0%',
      width: '100%',
      clippedStart,
      clippedEnd,
    });

    // Update column end time
    if (column < columnEnds.length) {
      columnEnds[column] = event.end;
    } else {
      columnEnds.push(event.end);
    }
  }

  // Calculate maxColumns for each event based on its overlap group
  return positions.map((pos, i) => {
    const event = sorted[i].event;

    // Find all events that overlap with this one
    const overlapping = positions.filter((_other, j) => {
      if (i === j) return false;
      return eventsOverlap(event, sorted[j].event);
    });

    // Max columns = highest column index in overlap group + 1
    const maxColumns = Math.max(
      pos.column + 1,
      ...overlapping.map((o) => o.column + 1)
    );

    // Calculate layout percentages
    const widthPercent = 100 / maxColumns;
    const leftPercent = widthPercent * pos.column;
    const gapPercent = 0.5; // Small gap between columns

    return {
      ...pos,
      maxColumns,
      left: `${leftPercent + gapPercent}%`,
      width: `${widthPercent - gapPercent * 2}%`,
    };
  });
}
