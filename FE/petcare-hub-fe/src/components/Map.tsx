import { useEffect, useRef } from 'react'

interface MapProps {
  lat: number
  lng: number
  onChange?: (lat: number, lng: number) => void
  readonly?: boolean
  height?: string
}

export const Map = ({ lat, lng, onChange, readonly = false, height = '300px' }: MapProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)

  // Sync marker and center when lat/lng from parent changes
  useEffect(() => {
    if (mapRef.current && markerRef.current) {
      markerRef.current.setLngLat([lng, lat])
      mapRef.current.panTo([lng, lat])
    }
  }, [lat, lng])

  useEffect(() => {
    if (!mapContainerRef.current) return

    const apiKey = import.meta.env.VITE_GOONG_MAPTILES_KEY || ''
    const isDefaultKey = !apiKey || apiKey.includes('YOUR_')

    const styleVal = isDefaultKey
      ? {
          version: 8,
          sources: {
            'osm-tiles': {
              type: 'raster',
              tiles: [
                'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
                'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
                'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
              ],
              tileSize: 256,
              attribution: '© OpenStreetMap contributors'
            }
          },
          layers: [
            {
              id: 'osm-tiles-layer',
              type: 'raster',
              source: 'osm-tiles',
              minzoom: 0,
              maxzoom: 19
            }
          ]
        }
      : 'https://tiles.goong.io/assets/goong_map_web.json'

    if (!isDefaultKey) {
      goongjs.accessToken = apiKey
    }
    
    // Goong JS Map initialization
    const map = new goongjs.Map({
      container: mapContainerRef.current,
      style: styleVal,
      center: [lng, lat], 
      zoom: 15,
    })
    mapRef.current = map

    // Navigation control
    map.addControl(new goongjs.NavigationControl(), 'top-right')

    // Create marker
    const marker = new goongjs.Marker({
      draggable: !readonly
    })
      .setLngLat([lng, lat])
      .addTo(map)
    markerRef.current = marker

    // Marker dragend event
    if (!readonly && onChange) {
      marker.on('dragend', () => {
        const lngLat = marker.getLngLat()
        onChange(lngLat.lat, lngLat.lng)
      })

      // Click on map to move marker
      map.on('click', (e: any) => {
        marker.setLngLat(e.lngLat)
        onChange(e.lngLat.lat, e.lngLat.lng)
      })
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        markerRef.current = null
      }
    }
  }, [readonly])

  return (
    <div 
      className="rounded-2xl overflow-hidden border border-[#e5d8d0] shadow-sm z-10"
      style={{ height, width: '100%' }}
    >
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  )
}

