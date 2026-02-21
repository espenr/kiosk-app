import { useState, useEffect, useRef } from 'react';
import { usePhotos } from '../../../hooks/usePhotos';

/**
 * Photo slideshow with crossfade transitions
 * Displays photos from iCloud Shared Album with Ken Burns effect
 */
export function PhotoSlideshow() {
  const { photos, currentPhoto, currentIndex, isLoading, error, isConfigured } =
    usePhotos();

  // Track the previous photo for crossfade effect
  const [displayedPhotos, setDisplayedPhotos] = useState<{
    current: string | null;
    previous: string | null;
  }>({ current: null, previous: null });

  // Track Ken Burns animation direction (alternates each slide)
  const [kenBurnsDirection, setKenBurnsDirection] = useState(0);
  const directionRef = useRef(0);

  // Update displayed photos when current photo changes
  useEffect(() => {
    if (currentPhoto?.url) {
      setDisplayedPhotos((prev) => {
        // Skip if URL hasn't changed (prevents unnecessary re-renders)
        if (prev.current === currentPhoto.url) return prev;
        return {
          current: currentPhoto.url,
          previous: prev.current,
        };
      });
      // Alternate Ken Burns direction
      directionRef.current = (directionRef.current + 1) % 4;
      setKenBurnsDirection(directionRef.current);
    }
  }, [currentPhoto?.url]);

  // Loading state
  if (isLoading && !isConfigured) {
    return (
      <div className="h-full w-full bg-gray-900 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="animate-pulse text-4xl mb-2">...</div>
          <div className="text-sm">Laster bilder</div>
        </div>
      </div>
    );
  }

  // Error or not configured state
  if (error || !isConfigured) {
    return (
      <div className="h-full w-full bg-gray-900 flex items-center justify-center">
        <div className="text-center text-gray-500 px-4">
          <div className="text-5xl mb-4 opacity-50">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div className="text-sm">
            {error || 'Ingen bilder konfigurert'}
          </div>
          <div className="text-xs mt-2 opacity-70">
            Kjør sync-photos.sh for å hente bilder
          </div>
        </div>
      </div>
    );
  }

  // Get Ken Burns transform based on direction
  const getKenBurnsStyle = (direction: number): React.CSSProperties => {
    // Subtle zoom and pan variations
    const transforms = [
      { from: 'scale(1) translate(0%, 0%)', to: 'scale(1.08) translate(-1%, -1%)' },
      { from: 'scale(1.08) translate(-1%, 1%)', to: 'scale(1) translate(0%, 0%)' },
      { from: 'scale(1) translate(0%, 0%)', to: 'scale(1.08) translate(1%, -1%)' },
      { from: 'scale(1.08) translate(1%, 1%)', to: 'scale(1) translate(0%, 0%)' },
    ];
    return {
      '--kb-from': transforms[direction].from,
      '--kb-to': transforms[direction].to,
    } as React.CSSProperties;
  };

  /**
   * Renders a photo with blurred background and sharp foreground
   * @param url - Photo URL
   * @returns Two-layer structure (blur + sharp)
   */
  function renderPhotoLayers(url: string) {
    return (
      <>
        {/* Blurred background layer - fills space with same image */}
        <div
          className="absolute inset-0 blur-photo-bg"
          style={{
            backgroundImage: `url(${url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        {/* Sharp foreground layer - preserves aspect ratio, top-aligned */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${url})`,
            backgroundSize: 'contain',
            backgroundPosition: 'top center',
            backgroundRepeat: 'no-repeat',
          }}
        />
      </>
    );
  }

  return (
    <div className="relative h-full w-full bg-gray-900 overflow-hidden">
      {/* Previous photo (fading out) */}
      {displayedPhotos.previous && displayedPhotos.previous !== displayedPhotos.current && (
        <div className="absolute inset-0 animate-photo-fade-out">
          {renderPhotoLayers(displayedPhotos.previous)}
        </div>
      )}

      {/* Current photo (fading in with Ken Burns) */}
      {displayedPhotos.current && (
        <div
          key={displayedPhotos.current}
          className="absolute inset-0 animate-photo-fade-in animate-ken-burns"
          style={{
            ...getKenBurnsStyle(kenBurnsDirection),
          }}
        >
          {renderPhotoLayers(displayedPhotos.current)}
        </div>
      )}

      {/* Photo counter (subtle, bottom right) */}
      {photos.length > 1 && (
        <div className="absolute bottom-2 right-2 bg-black/40 text-white/70 text-xs px-2 py-1 rounded">
          {currentIndex + 1} / {photos.length}
        </div>
      )}
    </div>
  );
}
