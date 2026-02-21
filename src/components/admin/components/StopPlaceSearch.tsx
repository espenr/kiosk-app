import { useState, useEffect, useRef } from 'preact/hooks';
import { searchStopPlaces, StopPlaceSuggestion } from '../../../services/entur';
import type { JSX } from 'preact';

interface StopPlaceSearchProps {
  label: string;
  value: StopPlaceSuggestion | null;
  onChange: (stop: StopPlaceSuggestion | null) => void;
  focusPoint?: { latitude: number; longitude: number };
  error?: string;
  required?: boolean;
}

export function StopPlaceSearch({
  label,
  value,
  onChange,
  focusPoint,
  error,
  required = false,
}: StopPlaceSearchProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<StopPlaceSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Don't search if query too short or if value selected
    if (query.length < 2 || value) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setSearchError(null);

    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchStopPlaces(query, focusPoint);
        setSuggestions(results);
        setIsOpen(true);
        setSearchError(null);
      } catch (err) {
        console.error('Stop search error:', err);
        setSearchError('Kunne ikke søke etter holdeplasser');
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, focusPoint, value]);

  const handleInputChange = (e: JSX.TargetedEvent<HTMLInputElement>) => {
    setQuery(e.currentTarget.value);
    // Clear selected value when user types
    if (value) {
      onChange(null);
    }
  };

  const handleSelect = (stop: StopPlaceSuggestion) => {
    onChange(stop);
    setQuery(stop.name);
    setIsOpen(false);
    setSuggestions([]);
  };

  const handleClear = () => {
    onChange(null);
    setQuery('');
    setSuggestions([]);
    setSearchError(null);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div className="relative">
        <input
          type="text"
          value={value ? value.name : query}
          onChange={handleInputChange}
          onFocus={() => {
            if (suggestions.length > 0) {
              setIsOpen(true);
            }
          }}
          placeholder="Søk etter holdeplass..."
          className={`w-full px-3 py-2 pr-20 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            error ? 'border-red-500' : 'border-gray-300'
          }`}
        />

        {/* Search icon */}
        <div className="absolute right-10 top-1/2 -translate-y-1/2 text-gray-400">
          {isLoading ? (
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            <svg
              className="h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          )}
        </div>

        {/* Clear button */}
        {(query || value) && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
          >
            <svg
              className="h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((stop) => (
            <button
              key={stop.id}
              type="button"
              onClick={() => handleSelect(stop)}
              className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none border-b border-gray-100 last:border-b-0"
            >
              <div className="font-medium text-gray-900">{stop.name}</div>
              <div className="text-sm text-gray-500 flex items-center gap-2">
                <span>{stop.locality}</span>
                {stop.distance !== undefined && (
                  <span className="text-xs">
                    • {stop.distance < 1 ? `${Math.round(stop.distance * 1000)}m` : `${stop.distance.toFixed(1)}km`}
                  </span>
                )}
                {stop.categories.length > 0 && (
                  <span className="text-xs text-gray-400">
                    {stop.categories.map((c) => c.replace('onstreet', '').replace('Bus', 'Buss')).join(', ')}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results */}
      {isOpen && !isLoading && suggestions.length === 0 && query.length >= 2 && !value && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-3 text-sm text-gray-500">
          Ingen holdeplasser funnet
        </div>
      )}

      {/* Error messages */}
      {(error || searchError) && (
        <p className="mt-1 text-sm text-red-600">{error || searchError}</p>
      )}

      {/* Selected confirmation chip */}
      {value && (
        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm">
          <svg
            className="h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span>
            {value.name}
            {value.locality && `, ${value.locality}`}
          </span>
        </div>
      )}
    </div>
  );
}
