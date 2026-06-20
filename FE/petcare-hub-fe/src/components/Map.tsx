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
      mapRef.current.jumpTo({ center: [lng, lat] })
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

    // Trigger map resize on load
    map.on('load', () => {
      map.resize()
      // Ẩn logo và attribution của Goong/Mapbox ngay khi load xong
      hideMapBranding()
    })

    // Helper: ẩn tất cả logo/attribution elements
    const hideMapBranding = () => {
      const container = mapContainerRef.current
      if (!container) return
      const selectors = [
        '.mapboxgl-ctrl-logo',
        '.goongjs-ctrl-logo',
        '.mapboxgl-ctrl-attrib',
        '.goongjs-ctrl-attrib',
        '.mapboxgl-ctrl-bottom-right',
        '.mapboxgl-ctrl-bottom-left',
      ]
      selectors.forEach(sel => {
        container.querySelectorAll(sel).forEach(el => {
          (el as HTMLElement).style.cssText = 'display:none!important;width:0!important;height:0!important;overflow:hidden!important'
        })
      })
    }

    // MutationObserver: bắt logo ngay khi nó được thêm vào DOM
    const observer = new MutationObserver(hideMapBranding)
    if (mapContainerRef.current) {
      observer.observe(mapContainerRef.current, { childList: true, subtree: true })
    }

    // Delayed resize to handle modal entrance transition / animation completion
    const resizeTimer = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.resize()
      }
      hideMapBranding()
    }, 400)

    return () => {
      observer.disconnect()
      clearTimeout(resizeTimer)
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

