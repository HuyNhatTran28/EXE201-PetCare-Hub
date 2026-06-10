import { useState, useEffect, useRef } from 'react'
import {
  Search,
  Compass,
  AlertTriangle,
  Locate,
  SlidersHorizontal
} from 'lucide-react'
import axios from 'axios'
import api from '@/lib/axios'
import { Header } from '@/components/Header'

interface HotelType {
  id: string
  name: string
  address: string | null
  rating?: number
  totalReviews?: number
  price?: number
  tags?: string[]
  image?: string
  isPopular?: boolean
  locationLat: number
  locationLong: number
}

interface PlaceSuggestion {
  place_id: string
  description: string
}

const DEFAULT_HOTEL_IMAGES = [
  'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800',
  'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800',
  'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=800'
]

// Google / Goong Polyline Decoder
const decodePolyline = (encoded: string): [number, number][] => {
  let index = 0, len = encoded.length
  let lat = 0, lng = 0
  const coordinates: [number, number][] = []

  while (index < len) {
    let b, shift = 0, result = 0
    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1))
    lat += dlat

    shift = 0
    result = 0
    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1))
    lng += dlng

    coordinates.push([lng / 1e5, lat / 1e5]) // [Lng, Lat]
  }
  return coordinates
}

export const RouteSearchPage = () => {
  
  // Origin State
  const [originQuery, setOriginQuery] = useState('')
  const [originSuggestions, setOriginSuggestions] = useState<PlaceSuggestion[]>([])
  const [originCoords, setOriginCoords] = useState<[number, number] | null>(null) // [lng, lat]
  const [showOriginDropdown, setShowOriginDropdown] = useState(false)

  // Destination State
  const [destinationCoords, setDestinationCoords] = useState<[number, number] | null>(null) // [lng, lat]

  // Search Param
  const [radius, setRadius] = useState<number>(2000) // in meters
  const [filterType, setFilterType] = useState<'ALL' | 'HOTEL' | 'SERVICE'>('ALL')
  const [showRadiusSettings, setShowRadiusSettings] = useState(false)

  // App States
  const [hotels, setHotels] = useState<HotelType[]>([])
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [userCurrentLocation, setUserCurrentLocation] = useState<[number, number] | null>(null)

  // Map Refs
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])

  const tilemapKey = import.meta.env.VITE_GOONG_MAPTILES_KEY || ''
  const servicesKey = import.meta.env.VITE_GOONG_API_KEY || ''

  // Fetch nearby hotels
  const fetchNearbyHotels = async (lat?: number, lng?: number, currentRadius?: number) => {
    try {
      const params: any = {}
      if (lat !== undefined && lng !== undefined) {
        params.lat = lat
        params.lng = lng
        params.radius = (currentRadius || radius) / 1000 // Convert meters to km
      }
      const res = await api.get('/api/hotels/nearby', { params })
      const list = (res.data || []).map((h: any, idx: number) => ({
        id: h.id,
        name: h.name,
        address: h.address || 'Hồ Chí Minh, Việt Nam',
        rating: h.averageRating || null,
        totalReviews: h.totalReviews || 0,
        price: h.minPrice || (300000 + (idx % 4) * 100000),
        tags: h.allowedPetTypes?.length > 0 ? h.allowedPetTypes : (idx % 2 === 0 ? ['Dogs', 'Cats'] : ['Small Pets']),
        image: (h.imageUrls && h.imageUrls.length > 0)
          ? h.imageUrls[0]
          : DEFAULT_HOTEL_IMAGES[idx % DEFAULT_HOTEL_IMAGES.length],
        isPopular: idx % 3 === 0,
        locationLat: h.locationLat,
        locationLong: h.locationLong
      }))
      setHotels(list)
    } catch (err) {
      console.error('Lỗi khi tải danh sách khách sạn:', err)
    }
  }

  // Geolocation Handler
  const geolocateUser = () => {
    if (!navigator.geolocation) {
      setError('Trình duyệt của bạn không hỗ trợ định vị GPS!')
      return
    }

    setError(null)
    setLoading(true)

    const geoOptions: PositionOptions = {
      enableHighAccuracy: false,   // dùng WiFi/IP thay vì GPS chip (nhanh hơn trên laptop)
      timeout: 15000,              // tối đa 15 giây
      maximumAge: 300000           // dùng cache vị trí trong 5 phút nếu có
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        const coords: [number, number] = [longitude, latitude]
        setUserCurrentLocation(coords)
        setOriginCoords(coords)
        
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo({
            center: coords,
            zoom: 14,
            essential: true
          })
        }

        if (servicesKey && !servicesKey.includes('YOUR_')) {
          try {
            const res = await axios.get(`https://rsapi.goong.io/Geocode`, {
              params: {
                latlng: `${latitude},${longitude}`,
                api_key: servicesKey
              }
            })
            if (res.data?.results && res.data.results.length > 0) {
              setOriginQuery(res.data.results[0].formatted_address)
            } else {
              setOriginQuery('Vị trí của bạn')
            }
          } catch (err) {
            console.error(err)
            setOriginQuery('Vị trí của bạn')
          }
        } else {
          setOriginQuery('Vị trí của bạn')
        }

        // Fetch nearby hotels centered on user location
        await fetchNearbyHotels(latitude, longitude, radius)
        setLoading(false)
      },
      (err) => {
        console.error('GPS Error code:', err.code, err.message)
        setLoading(false)

        const hcmCoords: [number, number] = [106.660172, 10.762622]
        setUserCurrentLocation(hcmCoords)

        // Specific messages per error code
        if (err.code === err.PERMISSION_DENIED) {
          setError(null)
          // Auto fallback to HCM so map is still usable
          fetchNearbyHotels(10.762622, 106.660172, radius)
          if (mapInstanceRef.current) {
            mapInstanceRef.current.flyTo({ center: hcmCoords, zoom: 12 })
          }
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setError('📡 Không thể xác định vị trí. Máy tính của bạn có thể không có GPS. Hệ thống sẽ hiển thị bản đồ mặc định tại TP.HCM.')
          // Fall back: load hotels at default HCM location
          fetchNearbyHotels(10.762622, 106.660172, radius)
        } else if (err.code === err.TIMEOUT) {
          setError('⏱️ Yêu cầu định vị bị hết thời gian. Đang thử lại...')
          // Retry once with low accuracy
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              const { latitude, longitude } = pos.coords
              const coords: [number, number] = [longitude, latitude]
              setUserCurrentLocation(coords)
              setOriginCoords(coords)
              setOriginQuery('Vị trí của bạn')
              setError(null)
              if (mapInstanceRef.current) {
                mapInstanceRef.current.flyTo({ center: coords, zoom: 14 })
              }
              await fetchNearbyHotels(latitude, longitude, radius)
            },
            () => {
              setError('❌ Không thể lấy vị trí GPS. Đang dùng TP.HCM làm mặc định.')
              fetchNearbyHotels(10.762622, 106.660172, radius)
            },
            { enableHighAccuracy: false, timeout: 20000, maximumAge: 600000 }
          )
        } else {
          setError('❌ Không thể lấy vị trí hiện tại. Vui lòng kiểm tra quyền định vị trong cài đặt trình duyệt.')
        }
      },
      geoOptions
    )
  }

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return

    const isDefaultKey = !tilemapKey || tilemapKey.includes('YOUR_')
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
      goongjs.accessToken = tilemapKey
    }

    const map = new goongjs.Map({
      container: mapContainerRef.current,
      style: styleVal,
      center: [106.660172, 10.762622], // Default HCMC
      zoom: 12
    })
    mapInstanceRef.current = map

    map.addControl(new goongjs.NavigationControl(), 'top-right')

    map.on('load', () => {
      setMapLoaded(true)
      // Fetch initial hotels so markers appear on map immediately
      fetchNearbyHotels()
      // Automatically geolocate user on map load
      geolocateUser()
    })

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // Auto-fetch suggestions on typing
  useEffect(() => {
    if (originQuery.trim().length < 3 || originQuery === 'Vị trí của bạn') {
      setOriginSuggestions([])
      return
    }
    const delayDebounce = setTimeout(() => {
      fetchSuggestions(originQuery)
    }, 450)
    return () => clearTimeout(delayDebounce)
  }, [originQuery])

  const fetchSuggestions = async (query: string) => {
    if (!servicesKey || servicesKey.includes('YOUR_')) return
    try {
      const response = await axios.get(`https://rsapi.goong.io/Place/AutoComplete`, {
        params: {
          api_key: servicesKey,
          input: query
        }
      })
      setOriginSuggestions(response.data.predictions || [])
    } catch (err) {
      console.error('Lỗi khi gợi ý địa điểm Goong:', err)
    }
  }

  const selectSuggestion = async (item: PlaceSuggestion) => {
    const label = item.description || ''
    const place_id = item.place_id

    setOriginQuery(label)
    setOriginSuggestions([])
    setShowOriginDropdown(false)

    try {
      const res = await axios.get(`https://rsapi.goong.io/Place/Detail`, {
        params: {
          api_key: servicesKey,
          place_id: place_id
        }
      })
      const loc = res.data?.result?.geometry?.location
      if (loc && loc.lng && loc.lat) {
        const coords: [number, number] = [loc.lng, loc.lat]
        updateMarker(coords)
        
        // Auto-fetch hotels for the newly selected origin coords
        await fetchNearbyHotels(loc.lat, loc.lng, radius)
        
        // Clear previous routes and states
        if (mapInstanceRef.current && mapInstanceRef.current.getSource('route')) {
          mapInstanceRef.current.getSource('route').setData({
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: [] }
          })
        }
        setDestinationCoords(null)
        setRouteInfo(null)
      }
    } catch (err) {
      console.error('Lỗi lấy chi tiết tọa độ Goong:', err)
    }
  }

  const updateMarker = (coords: [number, number]) => {
    setOriginCoords(coords)

    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo({
        center: coords,
        zoom: 14,
        essential: true
      })
    }
  }

  // Draw start & end markers and route path
  const drawRouteOnMap = (mapInstance: any, coordinates: [number, number][]) => {
    if (mapInstance.getSource('route')) {
      mapInstance.getSource('route').setData({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: coordinates }
      })
    } else {
      mapInstance.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: coordinates }
        }
      })

      mapInstance.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#fa7150', // Công nghệ màu cam thương hiệu
          'line-width': 6,
          'line-opacity': 0.85
        }
      })
    }
  }



  // Helper to draw a route path between two points and update routing info HUD
  const drawRouteBetweenPoints = async (start: [number, number], end: [number, number]): Promise<[number, number][] | null> => {
    if (!servicesKey || servicesKey.includes('YOUR_')) return null
    try {
      setLoading(true)
      setError(null)
      const routeUrl = `https://rsapi.goong.io/Direction?origin=${start[1]},${start[0]}&destination=${end[1]},${end[0]}&vehicle=car&api_key=${servicesKey}`
      const routeRes = await axios.get(routeUrl)
      
      if (!routeRes.data?.routes || routeRes.data.routes.length === 0) {
        throw new Error('Không tìm thấy tuyến đường hợp lệ giữa hai điểm này!')
      }

      const routeData = routeRes.data.routes[0]
      const coordinates = decodePolyline(routeData.overview_polyline.points)
      
      // Update Route Info
      const leg = routeData.legs[0]
      setRouteInfo({
        distance: leg.distance.text,
        duration: leg.duration.text
      })

      // Draw Route
      if (mapInstanceRef.current) {
        drawRouteOnMap(mapInstanceRef.current, coordinates)

        // Fit map view bounds
        const bounds = coordinates.reduce((acc: any, coord: [number, number]) => {
          return acc.extend(coord)
        }, new goongjs.LngLatBounds(coordinates[0], coordinates[0]))

        mapInstanceRef.current.fitBounds(bounds, { padding: 60 })
      }
      return coordinates
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Không thể tính toán đường đi!')
      return null
    } finally {
      setLoading(false)
    }
  }


  // Filter List Helper
  const getFilteredHotels = () => {
    return hotels.filter(h => {
      if (filterType === 'ALL') return true
      
      const isSpaOrGrooming = h.name.toLowerCase().includes('spa') || 
                              h.name.toLowerCase().includes('grooming') || 
                              h.name.toLowerCase().includes('dịch vụ') ||
                              h.address?.toLowerCase().includes('spa') ||
                              h.tags?.some(t => t.toLowerCase().includes('spa') || t.toLowerCase().includes('service') || t.toLowerCase().includes('dịch vụ'))
      
      if (filterType === 'HOTEL') {
        return !isSpaOrGrooming
      }
      if (filterType === 'SERVICE') {
        return isSpaOrGrooming
      }
      return true
    })
  }

  // Update Map Markers when hotels list, filterType, or mapLoaded changes
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return

    // Clear previous markers
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    // 1. Draw User Actual Location (Blue Pulsating Dot - Draggable)
    if (userCurrentLocation) {
      const userLocEl = document.createElement('div')
      userLocEl.className = 'relative flex items-center justify-center w-6 h-6 cursor-move'
      userLocEl.title = 'Kéo thả để chỉnh vị trí xuất phát của bạn'
      userLocEl.innerHTML = `
        <span class="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75 animate-ping"></span>
        <span class="relative rounded-full h-3.5 w-3.5 bg-blue-600 border-2 border-white shadow-lg"></span>
      `
      const userLocMarker = new goongjs.Marker({ element: userLocEl, draggable: true })
        .setLngLat(userCurrentLocation)
        .addTo(mapInstanceRef.current)
      
      userLocMarker.on('dragend', async () => {
        const lngLat = userLocMarker.getLngLat()
        const newCoords: [number, number] = [lngLat.lng, lngLat.lat]
        setUserCurrentLocation(newCoords)
        if (destinationCoords) {
          await drawRouteBetweenPoints(newCoords, destinationCoords)
        }
      })

      markersRef.current.push(userLocMarker)
    }

    // 2. Draw Searched Location (Red Map Pin) if it's different from actual location
    if (originCoords) {
      const isDifferentFromActual = !userCurrentLocation || 
        Math.abs(originCoords[0] - userCurrentLocation[0]) > 0.0005 || 
        Math.abs(originCoords[1] - userCurrentLocation[1]) > 0.0005

      if (isDifferentFromActual) {
        const pinEl = document.createElement('div')
        pinEl.className = 'w-7 h-7 flex items-center justify-center text-rose-500 hover:scale-110 active:scale-95 transition-transform cursor-pointer'
        pinEl.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-7 h-7 drop-shadow-md">
            <path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742c1.428-.973 3.425-2.585 4.708-4.708C19.785 14.73 21 12.383 21 9.75a8.25 8.25 0 00-16.5 0c0 2.633 1.215 4.978 2.663 7.147 1.283 2.123 3.28 3.735 4.708 4.708zM12 12.75a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
          </svg>
        `
        const pinMarker = new goongjs.Marker({ element: pinEl })
          .setLngLat(originCoords)
          .addTo(mapInstanceRef.current)
        markersRef.current.push(pinMarker)
      }
    }

    const list = getFilteredHotels()

    // Render Hotel markers as small circular orange pins with a white paw in the center
    list.forEach((hotel: HotelType) => {
      // Outer container positioned by Goong JS (avoids transform conflicts)
      const markerContainer = document.createElement('div')
      markerContainer.className = 'goong-hotel-marker'

      // Inner element for styling and hover scale animation
      const innerEl = document.createElement('div')
      innerEl.className = 'w-8 h-8 bg-[#fa7150] rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-[14px] cursor-pointer hover:bg-[#a43e24] hover:scale-110 active:scale-95 transition-all duration-200'
      innerEl.innerHTML = '🐾'
      markerContainer.appendChild(innerEl)

      const popup = new goongjs.Popup({ offset: 25 })
        .setLngLat([hotel.locationLong, hotel.locationLat])
        .setHTML(`
          <div style="font-family: sans-serif; text-align: left; min-width: 190px; font-size: 12px; color: #303330;">
            <h4 style="margin: 0 0 6px; font-weight: 800; color: #303330; font-size: 13px; line-height: 1.4;">${hotel.name}</h4>
            
            <!-- Rating Stars -->
            <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 6px; color: #f59e0b; font-weight: 700; font-size: 11px;">
              <span>⭐</span>
              <span>${hotel.rating ? hotel.rating.toFixed(1) : 'Chưa có đánh giá'}</span>
              ${hotel.totalReviews ? `<span style="color: #8a7e75; font-weight: normal;">(${hotel.totalReviews})</span>` : ''}
            </div>

            <p style="margin: 0 0 6px; color: #8a7e75; font-size: 11px; line-clamp: 2; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
              📍 ${hotel.address || 'Hồ Chí Minh, Việt Nam'}
            </p>
            
            <p style="margin: 0 0 10px; color: #fa7150; font-weight: 900; font-size: 13px;">
              ${(hotel.price || 0).toLocaleString('vi-VN')}đ<span style="font-size: 10px; font-weight: normal; color: #8a7e75;">/đêm</span>
            </p>

            <!-- Buttons Container -->
            <div style="display: flex; gap: 8px; margin-top: 8px;">
              <button id="popup-route-btn-${hotel.id}" style="flex: 1; background-color: #fa7150; color: white; border: none; border-radius: 99px; padding: 7px 0; font-size: 11px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background-color 0.2s; box-shadow: 0 4px 6px -1px rgba(250, 113, 80, 0.2);">
                Chỉ đường
              </button>
              <a href="/hotels/${hotel.id}" style="flex: 1; text-align: center; border: 1px solid #e1e3df; background-color: white; color: #5a5550; border-radius: 99px; padding: 7px 0; font-size: 11px; text-decoration: none; font-weight: 800; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">
                Chi tiết
              </a>
            </div>
          </div>
        `)

      // Click event to show route and open popup
      innerEl.addEventListener('click', (e) => {
        e.stopPropagation()
        popup.addTo(mapInstanceRef.current)
        
        // Fly map to hotel
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo({
            center: [hotel.locationLong, hotel.locationLat],
            zoom: 15,
            essential: true
          })
        }
      })

      popup.on('open', () => {
        const routeBtn = document.getElementById(`popup-route-btn-${hotel.id}`)
        if (routeBtn) {
          routeBtn.addEventListener('click', async (e) => {
            e.preventDefault()
            e.stopPropagation()
            
            const hotelCoords: [number, number] = [hotel.locationLong, hotel.locationLat]
            setDestinationCoords(hotelCoords)
            
            const startPoint = userCurrentLocation || originCoords || [106.660172, 10.762622]
            await drawRouteBetweenPoints(startPoint, hotelCoords)
          })
        }
      })

      const hotelMarker = new goongjs.Marker({ element: markerContainer })
        .setLngLat([hotel.locationLong, hotel.locationLat])
        .setPopup(popup)
        .addTo(mapInstanceRef.current)

      markersRef.current.push(hotelMarker)
    })
  }, [hotels, filterType, originCoords, destinationCoords, mapLoaded])

  // Handle core route search
  const handleSearchAlongRoute = async () => {
    setLoading(true)
    setError(null)
    setRouteInfo(null)

    const searchCoords = originCoords || userCurrentLocation || [106.660172, 10.762622]

    try {
      await fetchNearbyHotels(searchCoords[1], searchCoords[0], radius)
      
      // Clear route path on map if any
      if (mapInstanceRef.current && mapInstanceRef.current.getSource('route')) {
        mapInstanceRef.current.getSource('route').setData({
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: [] }
        })
      }
      setDestinationCoords(null)
      setRouteInfo(null)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Không thể tải danh sách khách sạn!')
    } finally {
      setLoading(false)
    }
  }

  const filteredHotelsList = getFilteredHotels()

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#faf9f6] text-[#303330]">
      {/* HEADER */}
      <Header />

      {/* SEARCH BANNER CONTAINER */}
      <div className="flex-grow flex flex-col h-[calc(100vh-80px)] overflow-hidden">
        
        {/* BOTTOM PORTION: SIDEBAR & MAP CONTAINER */}
        <div className="flex-grow flex flex-col lg:flex-row overflow-hidden">
          
          {/* RIGHT COLUMN: MAP CONTAINER */}
          <main className="flex-grow h-full relative bg-[#eeeeea]">
            <div ref={mapContainerRef} className="w-full h-full" />

            {/* FLOATING TOP ROW - SEARCH & FILTER PILLS */}
            <div className="absolute top-4 left-4 z-25 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 max-w-[calc(100vw-32px)]">
              
              {/* Rounded floating Search input bar */}
              <div className="relative w-72 md:w-80 bg-white border border-[#e1e3df] rounded-full shadow-lg flex items-center px-4 py-2 text-xs text-[#303330] z-30 font-semibold">
                <Search size={14} className="text-gray-400 mr-2 shrink-0" />
                <input
                  type="text"
                  placeholder="Nhập địa chỉ hoặc khu vực..."
                  value={originQuery}
                  onChange={e => {
                    setOriginQuery(e.target.value)
                    setShowOriginDropdown(true)
                  }}
                  onFocus={() => setShowOriginDropdown(true)}
                  onKeyDown={async e => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      await handleSearchAlongRoute()
                    }
                  }}
                  className="w-full bg-transparent border-0 outline-none text-xs font-semibold text-[#303330] placeholder-gray-400"
                />
                
                {/* Locate target button */}
                <button
                  type="button"
                  onClick={geolocateUser}
                  className="text-[#fa7150] hover:text-[#a43e24] transition-colors p-1 shrink-0 ml-1"
                  title="Lấy vị trí hiện tại"
                >
                  <Locate size={14} />
                </button>

                {/* Settings Toggle button */}
                <button
                  type="button"
                  onClick={() => setShowRadiusSettings(!showRadiusSettings)}
                  className={`p-1 shrink-0 ml-1 transition-colors ${showRadiusSettings ? 'text-[#fa7150]' : 'text-gray-400 hover:text-gray-600'}`}
                  title="Cấu hình bán kính"
                >
                  <SlidersHorizontal size={14} />
                </button>

                {/* Suggestions dropdown */}
                {showOriginDropdown && originSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border border-[#e5d8d0] shadow-xl max-h-60 overflow-y-auto z-50">
                    {originSuggestions.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => selectSuggestion(item)}
                        className="px-4 py-2.5 text-xs text-left hover:bg-[#fff0e6] hover:text-[#fa7150] cursor-pointer font-bold border-b border-[#f6efea] last:border-0 transition-colors"
                      >
                        {item.description}
                      </div>
                    ))}
                  </div>
                )}

                {/* Radius Slider Popover */}
                {showRadiusSettings && (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border border-[#e5d8d0] p-4 shadow-xl z-50 text-left">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-bold text-[#8a7e75]">
                        <span className="uppercase">Bán kính tìm kiếm</span>
                        <span className="text-[#fa7150] font-black text-xs">{(radius / 1000).toFixed(1)} km</span>
                      </div>
                      <input
                        type="range"
                        min={500}
                        max={10000}
                        step={500}
                        value={radius}
                        onChange={e => {
                          const newRadius = Number(e.target.value)
                          setRadius(newRadius)
                          if (originCoords) {
                            fetchNearbyHotels(originCoords[1], originCoords[0], newRadius)
                          }
                        }}
                        className="w-full h-1 bg-[#e1e3df] rounded-lg appearance-none cursor-pointer accent-[#fa7150]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Category Filter Pills next to Search Input */}
              <div className="flex gap-2 overflow-x-auto scrollbar-none z-20 shrink-0">
                {[
                  { id: 'ALL', label: 'Tất cả' },
                  { id: 'HOTEL', label: 'Khách sạn' },
                  { id: 'SERVICE', label: 'Dịch vụ' }
                ].map(pill => {
                  const isActive = filterType === pill.id
                  return (
                    <button
                      key={pill.id}
                      onClick={() => setFilterType(pill.id as any)}
                      className={`px-4 py-2 rounded-full font-bold text-xs border transition-all duration-200 whitespace-nowrap cursor-pointer shadow-md ${
                        isActive
                          ? 'bg-[#fa7150] text-white border-[#fa7150]'
                          : 'bg-white/95 backdrop-blur-sm border-[#e1e3df] text-[#5a5550] hover:border-[#fa7150]/40'
                      }`}
                    >
                      {pill.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Route path brief info floating */}
            {routeInfo && (
              <div className="absolute top-[120px] sm:top-[72px] left-4 z-10 bg-white/95 backdrop-blur-sm border border-[#fa7150]/20 rounded-2xl p-4 shadow-xl flex justify-between items-center gap-4 text-left min-w-[240px]">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-[#8a7e75] uppercase">Độ dài tuyến đường</p>
                  <p className="text-xs font-black text-[#303330] flex items-center gap-1">
                    <Compass size={14} className="text-[#fa7150]" /> {routeInfo.distance} ({routeInfo.duration})
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-[#8a7e75] uppercase">Tìm thấy</p>
                  <p className="text-xs font-black text-[#fa7150]">{filteredHotelsList.length} địa điểm</p>
                </div>
              </div>
            )}

            {/* General Error Message floating */}
            {error && (
              <div className="absolute top-[120px] sm:top-[72px] left-4 z-10 bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl text-xs font-bold flex items-start gap-2 text-left shadow-lg max-w-sm">
                <AlertTriangle size={16} className="shrink-0 text-rose-500 mt-0.5" />
                <div className="flex-grow">
                  <span>{error}</span>
                  <button onClick={() => setError(null)} className="block mt-1 text-rose-400 hover:text-rose-600 text-[9px] cursor-pointer underline">Đóng</button>
                </div>
              </div>
            )}

            {/* Floating GPS crosshair button — matches mockup design */}
            <button
              onClick={geolocateUser}
              className="absolute bottom-8 right-4 w-12 h-12 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all z-20 cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', boxShadow: '0 4px 20px rgba(109,40,217,0.45)' }}
              title="Lấy vị trí GPS hiện tại"
            >
              <Locate size={22} className="text-white" />
            </button>

            {/* Goong Maps branding badge */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-md border border-white/60 shadow-lg px-3 py-1.5 rounded-full flex items-center gap-2 z-10 pointer-events-none">
              <span className="w-2 h-2 rounded-full bg-[#fa7150] animate-pulse" />
              <span className="text-[10px] font-bold text-[#303330] tracking-wide">Goong Maps</span>
            </div>
          </main>
      </div>
    </div>
    
    {/* Global custom styles for popup rounded corners and clean close buttons */}
    <style>{`
      .mapboxgl-popup-content,
      .goongjs-popup-content,
      .goong-popup-content {
        border-radius: 20px !important;
        padding: 16px !important;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1) !important;
        border: 1px solid rgba(229, 216, 208, 0.5) !important;
      }
      .mapboxgl-popup-close-button,
      .goongjs-popup-close-button,
      .goong-popup-close-button {
        font-size: 16px !important;
        color: #8a7e75 !important;
        padding: 4px 8px !important;
        top: 8px !important;
        right: 8px !important;
        outline: none !important;
        border-radius: 50% !important;
        line-height: 1 !important;
      }
      .mapboxgl-popup-close-button:hover,
      .goongjs-popup-close-button:hover,
      .goong-popup-close-button:hover {
        background-color: #f3f4f6 !important;
        color: #303330 !important;
      }
      .mapboxgl-popup-tip,
      .goongjs-popup-tip,
      .goong-popup-tip {
        border-bottom-color: white !important;
        border-top-color: white !important;
      }
    `}</style>
  </div>
  )
}
