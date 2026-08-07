import React, { useState } from 'react';
import MapView from './components/MapView';
import SearchBar from './components/search/SearchBar';
import PlaceDetailsSheet from './components/places/PlaceDetailsSheet';

export default function Home() {
  const [selectedResult, setSelectedResult] = useState<any | null>(null);
  const [placeDetails, setPlaceDetails] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const handleSelectResult = async (res: any) => {
    setSelectedResult(res);
    // fetch details from API route
    if (!res?.fsq_id) return;
    setLoadingDetails(true);
    try {
    const r = await fetch(`/.netlify/functions/places-get?id=${res.fsq_id}`);
      const data = await r.json();
      // map Foursquare shape to PlaceDetailsSheet expected shape
      const photo = data.photos && data.photos[0] ? `${data.photos[0].prefix}original${data.photos[0].suffix}` : data.photo_url || null;
      const place = {
        fsq_id: data.fsq_id || res.fsq_id,
        name: data.name || res.name,
        address: data.location?.formatted_address || res.location?.formatted_address || res.location?.address,
        latitude: data.geocodes?.main?.latitude || res.geocodes?.main?.latitude,
        longitude: data.geocodes?.main?.longitude || res.geocodes?.main?.longitude,
        category: data.categories?.[0]?.name || res.categories?.[0]?.name,
        photo_url: photo,
        rating: data.rating,
        description: data.description,
      };
      setPlaceDetails(place);
    } catch (err) {
      console.error('Failed to load place details', err);
      setPlaceDetails({
        fsq_id: res.fsq_id,
        name: res.name,
        address: res.location?.formatted_address || res.location?.address,
        latitude: res.geocodes?.main?.latitude,
        longitude: res.geocodes?.main?.longitude,
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <h1 className="text-4xl font-extrabold text-center">Welcome to Venture</h1>
      <p className="mt-2 text-lg text-gray-600 text-center max-w-xl">Explore and save amazing places.</p>

      <div className="mt-6 w-full max-w-4xl relative">
        <SearchBar onSelectResult={handleSelectResult} />
        <div className="mt-12 w-full h-[28rem]">
          <MapView />
        </div>
      </div>

      {placeDetails && (
        <PlaceDetailsSheet
          place={placeDetails}
          onClose={() => setPlaceDetails(null)}
          onSavedSuccess={() => setPlaceDetails(null)}
        />
      )}
    </div>
  );
}
