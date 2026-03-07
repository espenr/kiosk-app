import { useState, useEffect } from 'react';
import { usePhotos } from '../../../hooks/usePhotos';

/**
 * Photo slideshow with crossfade transitions
 * Displays photos from iCloud Shared Album
 */
export function PhotoSlideshow() {
  const { photos, currentPhoto, currentIndex, isLoading, error, isConfigured } =
    usePhotos();

  // Track the previous photo for crossfade effect
  const [displayedPhotos, setDisplayedPhotos] = useState<{
    current: string | null;
    previous: string | null;
  }>({ current: null, previous: null });

  // Track current aspect ratio to prevent layout shift
  const [currentAspect, setCurrentAspect] = useState<string>('9/16'); // Default portrait

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

  /**
   * Renders a photo with blurred background and sharp foreground using native img tags
   * @param url - Photo URL
   * @returns Two-layer structure (blur + sharp)
   */
  function renderPhotoLayers(url: string) {
    const handleImageLoad = (e: Event) => {
      const img = e.target as HTMLImageElement;
      const aspect = `${img.naturalWidth}/${img.naturalHeight}`;
      setCurrentAspect(aspect);
    };

    return (
      <>
        {/* Blurred background layer - fills space with same image */}
        <img
          src={url}
          alt=""
          className="absolute inset-0 w-full h-full object-cover blur-photo-bg photo-layer"
          loading="eager"
          decoding="async"
        />
        {/* Sharp foreground layer - preserves aspect ratio, top-aligned */}
        <img
          src={url}
          alt="Family photo"
          style={{ aspectRatio: currentAspect }}
          className="absolute inset-0 w-full h-full object-contain object-top photo-layer"
          loading="eager"
          decoding="async"
          onLoad={handleImageLoad}
        />
      </>
    );
  }

  return (
    <div className="relative h-full w-full bg-gray-900 overflow-hidden photo-slideshow-root">
      {/* Previous photo (fading out) */}
      {displayedPhotos.previous && displayedPhotos.previous !== displayedPhotos.current && (
        <div className="absolute inset-0 animate-photo-fade-out photo-container">
          {renderPhotoLayers(displayedPhotos.previous)}
        </div>
      )}

      {/* Current photo (fading in) */}
      {displayedPhotos.current && (
        <div
          key={displayedPhotos.current}
          className="absolute inset-0 animate-photo-fade-in photo-container"
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
