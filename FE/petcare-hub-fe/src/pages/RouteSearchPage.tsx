import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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

declare const goongjs: any

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
  amenities?: string[]
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
  let index = 0
  const len = encoded.length
  let lat = 0
  let lng = 0
  const coordinates: [number, number][] = []

  while (index < len) {
    let b
    let shift = 0
    let result = 0

    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)

    const dlat = (result & 1) ? ~(result >> 1) : (result >> 1)
    lat += dlat

    shift = 0
    result = 0

    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)

    const dlng = (result & 1) ? ~(result >> 1) : (result >> 1)
    lng += dlng

    // Goong/Mapbox dùng [lng, lat]
    coordinates.push([lng / 1e5, lat / 1e5])
  }

  return coordinates
}

export const RouteSearchPage = () => {
  // Origin State
  const [originQuery, setOriginQuery] = useState('')
  const [originSuggestions, setOriginSuggestions] = useState<PlaceSuggestion[]>([])
  const [originCoords, setOriginCoords] = useState<[number, number] | null>(null)
  const [showOriginDropdown, setShowOriginDropdown] = useState(false)

  // Destination State
  const [destinationCoords, setDestinationCoords] = useState<[number, number] | null>(null)

  // Search Param
  const [radius, setRadius] = useState<number>(2000)
  const [filterType, setFilterType] = useState<'ALL' | 'HOTEL' | 'SERVICE'>('ALL')
  const [showRadiusSettings, setShowRadiusSettings] = useState(false)

  // App States
  const [hotels, setHotels] = useState<HotelType[]>([])
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [userCurrentLocation, setUserCurrentLocation] = useState<[number, number] | null>(null)

  // Motorbike moving state
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([])
  const [isMoving, setIsMoving] = useState(false)

  // Map Refs
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])

  // Motorbike refs
  const motorbikeMarkerRef = useRef<any>(null)
  const animationFrameRef = useRef<number | null>(null)

  const tilemapKey = import.meta.env.VITE_GOONG_MAPTILES_KEY || ''
  const servicesKey = import.meta.env.VITE_GOONG_API_KEY || ''

  const fetchNearbyHotels = async (
    lat?: number,
    lng?: number,
    currentRadius?: number
  ) => {
    try {
      const params: any = {}

      if (lat !== undefined && lng !== undefined) {
        params.lat = lat
        params.lng = lng
        params.radius = (currentRadius || radius) / 1000
      }

      const res = await api.get('/api/hotels/nearby', { params })

      const list = (res.data || []).map((h: any, idx: number) => ({
        id: h.id,
        name: h.name,
        address: h.address || 'Hồ Chí Minh, Việt Nam',
        rating: h.averageRating || null,
        totalReviews: h.totalReviews || 0,
        price: h.minPrice || undefined,
        tags: h.allowedPetTypes || [],
        image:
          h.imageUrls && h.imageUrls.length > 0
            ? h.imageUrls[0]
            : DEFAULT_HOTEL_IMAGES[idx % DEFAULT_HOTEL_IMAGES.length],
        isPopular: (h.averageRating && h.averageRating >= 4.8 && h.totalReviews > 5) || false,
        locationLat: h.locationLat,
        locationLong: h.locationLong,
        amenities: h.amenities || []
      }))

      setHotels(list)
    } catch (err) {
      console.error('Lỗi khi tải danh sách khách sạn:', err)
    }
  }

  const removeMotorbikeMarker = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    if (motorbikeMarkerRef.current) {
      motorbikeMarkerRef.current.remove()
      motorbikeMarkerRef.current = null
    }

    setIsMoving(false)
  }

  const getDistanceMeters = (a: [number, number], b: [number, number]) => {
    const R = 6371000
    const lat1 = a[1] * Math.PI / 180
    const lat2 = b[1] * Math.PI / 180
    const dLat = (b[1] - a[1]) * Math.PI / 180
    const dLng = (b[0] - a[0]) * Math.PI / 180

    const x =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)

    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
  }

  const getBearing = (a: [number, number], b: [number, number]) => {
    const lat1 = a[1] * Math.PI / 180
    const lat2 = b[1] * Math.PI / 180
    const dLng = (b[0] - a[0]) * Math.PI / 180

    const y = Math.sin(dLng) * Math.cos(lat2)
    const x =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)

    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360
  }

  const interpolatePoint = (
    a: [number, number],
    b: [number, number],
    t: number
  ): [number, number] => {
    return [
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t
    ]
  }

  const startMotorbikeMoving = () => {
    if (!mapInstanceRef.current) return

    if (!routeCoordinates || routeCoordinates.length < 2) {
      setError('Bạn cần chọn địa điểm pet và bấm Chỉ đường trước khi bắt đầu di chuyển.')
      return
    }

    removeMotorbikeMarker()
    setIsMoving(true)
    setError(null)

    const motorbikeEl = document.createElement('div')
    motorbikeEl.className = 'motorbike-marker'
    motorbikeEl.innerHTML = '🏍️'

    motorbikeMarkerRef.current = new goongjs.Marker({
      element: motorbikeEl,
      anchor: 'center'
    })
      .setLngLat(routeCoordinates[0])
      .addTo(mapInstanceRef.current)

    const segmentDistances: number[] = []
    let totalDistance = 0

    for (let i = 0; i < routeCoordinates.length - 1; i++) {
      const d = getDistanceMeters(routeCoordinates[i], routeCoordinates[i + 1])
      segmentDistances.push(d)
      totalDistance += d
    }

    // Fake tốc độ demo.
    // Tăng số này nếu muốn xe chạy nhanh hơn.
    const speedKmh = 35
    const speedMps = speedKmh * 1000 / 3600

    let startTime: number | null = null

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp

      const elapsedSeconds = (timestamp - startTime) / 1000
      const traveled = elapsedSeconds * speedMps

      if (traveled >= totalDistance) {
        const lastPoint = routeCoordinates[routeCoordinates.length - 1]

        motorbikeMarkerRef.current?.setLngLat(lastPoint)

        mapInstanceRef.current.flyTo({
          center: lastPoint,
          zoom: 16,
          essential: true
        })

        setIsMoving(false)
        return
      }

      let accumulated = 0

      for (let i = 0; i < segmentDistances.length; i++) {
        const segmentDistance = segmentDistances[i]

        if (accumulated + segmentDistance >= traveled) {
          const remain = traveled - accumulated
          const t = remain / segmentDistance

          const currentPoint = interpolatePoint(
            routeCoordinates[i],
            routeCoordinates[i + 1],
            t
          )

          const bearing = getBearing(
            routeCoordinates[i],
            routeCoordinates[i + 1]
          )

          motorbikeMarkerRef.current?.setLngLat(currentPoint)

          // Nếu icon bị ngược hướng thì đổi bearing + 90 hoặc bearing + 180
          motorbikeEl.style.transform = `rotate(${bearing}deg)`

          mapInstanceRef.current.easeTo({
            center: currentPoint,
            zoom: 16,
            duration: 200
          })

          break
        }

        accumulated += segmentDistance
      }

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animationFrameRef.current = requestAnimationFrame(animate)
  }

  const geolocateUser = () => {
    if (!navigator.geolocation) {
      setError('Trình duyệt của bạn không hỗ trợ định vị GPS!')
      return
    }

    setError(null)
    setLoading(true)

    const geoOptions: PositionOptions = {
      enableHighAccuracy: false,
      timeout: 15000,
      maximumAge: 300000
    }

    navigator.geolocation.getCurrentPosition(
      async position => {
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
            const res = await axios.get('https://rsapi.goong.io/Geocode', {
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

        await fetchNearbyHotels(latitude, longitude, radius)
        setLoading(false)
      },
      err => {
        console.error('GPS Error code:', err.code, err.message)
        setLoading(false)

        const hcmCoords: [number, number] = [106.660172, 10.762622]
        setUserCurrentLocation(hcmCoords)
        setOriginCoords(hcmCoords)
        setOriginQuery('TP.HCM mặc định')

        if (err.code === err.PERMISSION_DENIED) {
          setError(
            'Bạn đã chặn quyền vị trí. Hệ thống đang dùng TP.HCM làm vị trí mặc định.'
          )

          fetchNearbyHotels(10.762622, 106.660172, radius)

          if (mapInstanceRef.current) {
            mapInstanceRef.current.flyTo({
              center: hcmCoords,
              zoom: 12
            })
          }
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setError(
            'Không thể xác định vị trí. Hệ thống đang dùng TP.HCM làm vị trí mặc định.'
          )

          fetchNearbyHotels(10.762622, 106.660172, radius)
        } else if (err.code === err.TIMEOUT) {
          setError('Yêu cầu định vị bị hết thời gian. Đang dùng TP.HCM làm mặc định.')
          fetchNearbyHotels(10.762622, 106.660172, radius)
        } else {
          setError(
            'Không thể lấy vị trí hiện tại. Vui lòng kiểm tra quyền định vị trong trình duyệt.'
          )
        }
      },
      geoOptions
    )
  }

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
      center: [106.660172, 10.762622],
      zoom: 12
    })

    mapInstanceRef.current = map

    map.addControl(new goongjs.NavigationControl(), 'top-right')

    map.on('load', () => {
      setMapLoaded(true)
      fetchNearbyHotels()
      geolocateUser()
    })

    return () => {
      removeMotorbikeMarker()

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

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
      const response = await axios.get(
        'https://rsapi.goong.io/Place/AutoComplete',
        {
          params: {
            api_key: servicesKey,
            input: query
          }
        }
      )

      setOriginSuggestions(response.data.predictions || [])
    } catch (err) {
      console.error('Lỗi khi gợi ý địa điểm Goong:', err)
    }
  }

  const selectSuggestion = async (item: PlaceSuggestion) => {
    const label = item.description || ''
    const placeId = item.place_id

    setOriginQuery(label)
    setOriginSuggestions([])
    setShowOriginDropdown(false)

    try {
      const res = await axios.get('https://rsapi.goong.io/Place/Detail', {
        params: {
          api_key: servicesKey,
          place_id: placeId
        }
      })

      const loc = res.data?.result?.geometry?.location

      if (loc && loc.lng && loc.lat) {
        const coords: [number, number] = [loc.lng, loc.lat]

        updateMarker(coords)
        await fetchNearbyHotels(loc.lat, loc.lng, radius)

        if (mapInstanceRef.current && mapInstanceRef.current.getSource('route')) {
          mapInstanceRef.current.getSource('route').setData({
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: []
            }
          })
        }

        removeMotorbikeMarker()
        setDestinationCoords(null)
        setRouteInfo(null)
        setRouteCoordinates([])
      }
    } catch (err) {
      console.error('Lỗi lấy chi tiết tọa độ Goong:', err)
    }
  }

  const updateMarker = (coords: [number, number]) => {
    setOriginCoords(coords)
    setUserCurrentLocation(coords)

    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo({
        center: coords,
        zoom: 14,
        essential: true
      })
    }
  }

  const drawRouteOnMap = (
    mapInstance: any,
    coordinates: [number, number][]
  ) => {
    if (mapInstance.getSource('route')) {
      mapInstance.getSource('route').setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates
        }
      })
    } else {
      mapInstance.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates
          }
        }
      })

      mapInstance.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#fa7150',
          'line-width': 6,
          'line-opacity': 0.85
        }
      })
    }
  }

  const drawRouteBetweenPoints = async (
    start: [number, number],
    end: [number, number]
  ): Promise<[number, number][] | null> => {
    if (!servicesKey || servicesKey.includes('YOUR_')) {
      setError('Bạn chưa cấu hình VITE_GOONG_API_KEY.')
      return null
    }

    try {
      setLoading(true)
      setError(null)
      removeMotorbikeMarker()

      const routeRes = await axios.get('https://rsapi.goong.io/Direction', {
        params: {
          origin: `${start[1]},${start[0]}`,
          destination: `${end[1]},${end[0]}`,
          vehicle: 'bike',
          api_key: servicesKey
        }
      })

      if (!routeRes.data?.routes || routeRes.data.routes.length === 0) {
        throw new Error('Không tìm thấy tuyến đường hợp lệ giữa hai điểm này!')
      }

      const routeData = routeRes.data.routes[0]
      const coordinates = decodePolyline(routeData.overview_polyline.points)

      setRouteCoordinates(coordinates)

      const leg = routeData.legs[0]

      setRouteInfo({
        distance: leg.distance.text,
        duration: leg.duration.text
      })

      if (mapInstanceRef.current) {
        drawRouteOnMap(mapInstanceRef.current, coordinates)

        const bounds = coordinates.reduce((acc: any, coord: [number, number]) => {
          return acc.extend(coord)
        }, new goongjs.LngLatBounds(coordinates[0], coordinates[0]))

        mapInstanceRef.current.fitBounds(bounds, {
          padding: 80
        })
      }

      return coordinates
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Không thể tính toán đường đi!')
      setRouteCoordinates([])
      return null
    } finally {
      setLoading(false)
    }
  }

  const getFilteredHotels = () => {
    return hotels.filter(h => {
      if (filterType === 'ALL') return true

      const isSpaOrGrooming =
        h.name.toLowerCase().includes('spa') ||
        h.name.toLowerCase().includes('grooming') ||
        h.name.toLowerCase().includes('dịch vụ') ||
        h.name.toLowerCase().includes('clinic') ||
        h.name.toLowerCase().includes('thú y') ||
        h.address?.toLowerCase().includes('spa') ||
        h.tags?.some(
          t =>
            t.toLowerCase().includes('spa') ||
            t.toLowerCase().includes('service') ||
            t.toLowerCase().includes('dịch vụ')
        ) ||
        h.amenities?.some(
          a =>
            a.toLowerCase().includes('spa') ||
            a.toLowerCase().includes('grooming') ||
            a.toLowerCase().includes('veterinary') ||
            a.toLowerCase().includes('clinic') ||
            a.toLowerCase().includes('pet shop') ||
            a.toLowerCase().includes('dịch vụ')
        )

      // Cơ sở được tính là khách sạn nếu:
      // 1. Có tiện ích lưu trú (Pet Boarding/Lưu trú)
      // 2. Hoặc có giá phòng hiển thị (> 0)
      // 3. Hoặc chưa cấu hình tiện ích nào (mới tạo)
      // 4. Hoặc tên không chứa các từ khóa chỉ phòng khám/bệnh viện y tế thuần túy.
      const isHotel =
        h.amenities?.some(a => a.toLowerCase().includes('boarding') || a.toLowerCase().includes('lưu trú')) ||
        (h.price !== undefined && h.price > 0) ||
        (!h.amenities || h.amenities.length === 0) ||
        (!h.name.toLowerCase().includes('clinic') && !h.name.toLowerCase().includes('bệnh viện') && !h.name.toLowerCase().includes('phòng khám'))

      if (filterType === 'HOTEL') {
        return isHotel
      }

      if (filterType === 'SERVICE') {
        return isSpaOrGrooming
      }

      return true
    })
  }

  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return

    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    if (userCurrentLocation) {
      const userLocEl = document.createElement('div')
      userLocEl.className = 'relative flex items-center justify-center w-6 h-6 cursor-move'
      userLocEl.title = 'Kéo thả để chỉnh vị trí xuất phát của bạn'
      userLocEl.innerHTML = `
        <span class="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75 animate-ping"></span>
        <span class="relative rounded-full h-3.5 w-3.5 bg-blue-600 border-2 border-white shadow-lg"></span>
      `

      const userLocMarker = new goongjs.Marker({
        element: userLocEl,
        draggable: true
      })
        .setLngLat(userCurrentLocation)
        .addTo(mapInstanceRef.current)

      userLocMarker.on('dragend', async () => {
        const lngLat = userLocMarker.getLngLat()
        const newCoords: [number, number] = [lngLat.lng, lngLat.lat]

        setUserCurrentLocation(newCoords)
        setOriginCoords(newCoords)
        setOriginQuery('Vị trí đã chỉnh')

        removeMotorbikeMarker()

        if (destinationCoords) {
          await drawRouteBetweenPoints(newCoords, destinationCoords)
        }
      })

      markersRef.current.push(userLocMarker)
    }

    const list = getFilteredHotels()

    list.forEach((hotel: HotelType) => {
      const markerContainer = document.createElement('div')
      markerContainer.className = 'goong-hotel-marker'

      const innerEl = document.createElement('div')
      innerEl.className =
        'w-8 h-8 bg-[#fa7150] rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-[14px] cursor-pointer hover:bg-[#a43e24] hover:scale-110 active:scale-95 transition-all duration-200'

      innerEl.innerHTML = '🐾'
      markerContainer.appendChild(innerEl)

      const popup = new goongjs.Popup({ offset: 25 })
        .setLngLat([hotel.locationLong, hotel.locationLat])
        .setHTML(`
          <div style="font-family: sans-serif; text-align: left; min-width: 190px; font-size: 12px; color: #303330;">
            <h4 style="margin: 0 0 6px; font-weight: 800; color: #303330; font-size: 13px; line-height: 1.4;">
              ${hotel.name}
            </h4>

            <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 6px; color: #f59e0b; font-weight: 700; font-size: 11px;">
              <span>⭐</span>
              <span>${hotel.rating ? hotel.rating.toFixed(1) : 'Chưa có đánh giá'}</span>
              ${hotel.totalReviews
            ? `<span style="color: #8a7e75; font-weight: normal;">(${hotel.totalReviews})</span>`
            : ''
          }
            </div>

            <p style="margin: 0 0 6px; color: #8a7e75; font-size: 11px; line-clamp: 2; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
              📍 ${hotel.address || 'Hồ Chí Minh, Việt Nam'}
            </p>

            <p style="margin: 0 0 10px; color: #fa7150; font-weight: 900; font-size: 13px;">
              ${hotel.price
                ? `${hotel.price.toLocaleString('vi-VN')}đ<span style="font-size: 10px; font-weight: normal; color: #8a7e75;">/đêm</span>`
                : 'Chưa có phòng'
              }
            </p>

            <div style="display: flex; gap: 8px; margin-top: 8px;">
              <button
                id="popup-route-btn-${hotel.id}"
                style="flex: 1; background-color: #fa7150; color: white; border: none; border-radius: 99px; padding: 7px 0; font-size: 11px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background-color 0.2s; box-shadow: 0 4px 6px -1px rgba(250, 113, 80, 0.2);"
              >
                Chỉ đường
              </button>

              <a
                href="/hotels/${hotel.id}"
                style="flex: 1; text-align: center; border: 1px solid #e1e3df; background-color: white; color: #5a5550; border-radius: 99px; padding: 7px 0; font-size: 11px; text-decoration: none; font-weight: 800; display: flex; align-items: center; justify-content: center; transition: all 0.2s;"
              >
                Chi tiết
              </a>
            </div>
          </div>
        `)

      innerEl.addEventListener('click', e => {
        e.stopPropagation()
        popup.addTo(mapInstanceRef.current)

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
          routeBtn.onclick = async e => {
            e.preventDefault()
            e.stopPropagation()

            const hotelCoords: [number, number] = [
              hotel.locationLong,
              hotel.locationLat
            ]

            setDestinationCoords(hotelCoords)

            const startPoint =
              userCurrentLocation ||
              originCoords ||
              ([106.660172, 10.762622] as [number, number])

            await drawRouteBetweenPoints(startPoint, hotelCoords)
          }
        }
      })

      const hotelMarker = new goongjs.Marker({
        element: markerContainer
      })
        .setLngLat([hotel.locationLong, hotel.locationLat])
        .setPopup(popup)
        .addTo(mapInstanceRef.current)

      markersRef.current.push(hotelMarker)
    })
  }, [
    hotels,
    filterType,
    originCoords,
    destinationCoords,
    userCurrentLocation,
    mapLoaded
  ])

  const handleSearchAlongRoute = async () => {
    setLoading(true)
    setError(null)
    setRouteInfo(null)
    setRouteCoordinates([])
    removeMotorbikeMarker()

    const searchCoords =
      originCoords ||
      userCurrentLocation ||
      ([106.660172, 10.762622] as [number, number])

    try {
      await fetchNearbyHotels(searchCoords[1], searchCoords[0], radius)

      if (mapInstanceRef.current && mapInstanceRef.current.getSource('route')) {
        mapInstanceRef.current.getSource('route').setData({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: []
          }
        })
      }

      setDestinationCoords(null)
      setRouteInfo(null)
      setRouteCoordinates([])
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
      <Header />

      <div className="flex-grow flex flex-col h-[calc(100vh-80px)] overflow-hidden">
        <div className="flex-grow flex flex-col lg:flex-row overflow-hidden">
          <main className="flex-grow h-full relative bg-[#eeeeea]">
            <div ref={mapContainerRef} className="w-full h-full" />

            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="absolute top-4 left-4 z-25 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 max-w-[calc(100vw-32px)]"
            >
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

                <button
                  type="button"
                  onClick={geolocateUser}
                  className="text-[#fa7150] hover:text-[#a43e24] transition-colors p-1 shrink-0 ml-1"
                  title="Lấy vị trí hiện tại"
                >
                  <Locate size={14} />
                </button>

                <button
                  type="button"
                  onClick={() => setShowRadiusSettings(!showRadiusSettings)}
                  className={`p-1 shrink-0 ml-1 transition-colors ${showRadiusSettings
                    ? 'text-[#fa7150]'
                    : 'text-gray-400 hover:text-gray-600'
                    }`}
                  title="Cấu hình bán kính"
                >
                  <SlidersHorizontal size={14} />
                </button>

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

                {showRadiusSettings && (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border border-[#e5d8d0] p-4 shadow-xl z-50 text-left">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-bold text-[#8a7e75]">
                        <span className="uppercase">Bán kính tìm kiếm</span>
                        <span className="text-[#fa7150] font-black text-xs">
                          {(radius / 1000).toFixed(1)} km
                        </span>
                      </div>

                      <input
                        type="range"
                        min={0}
                        max={30000}
                        step={1000}
                        value={radius}
                        onChange={e => {
                          const newRadius = Number(e.target.value)
                          setRadius(newRadius)

                          const currentCoords = originCoords || userCurrentLocation

                          if (currentCoords) {
                            fetchNearbyHotels(
                              currentCoords[1],
                              currentCoords[0],
                              newRadius
                            )
                          }
                        }}
                        className="w-full h-1 bg-[#e1e3df] rounded-lg appearance-none cursor-pointer accent-[#fa7150]"
                      />
                    </div>
                  </div>
                )}
              </div>

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
                      className={`px-4 py-2 rounded-full font-bold text-xs border transition-all duration-200 whitespace-nowrap cursor-pointer shadow-md ${isActive
                        ? 'bg-[#fa7150] text-white border-[#fa7150]'
                        : 'bg-white/95 backdrop-blur-sm border-[#e1e3df] text-[#5a5550] hover:border-[#fa7150]/40'
                        }`}
                    >
                      {pill.label}
                    </button>
                  )
                })}
              </div>
            </motion.div>

            <AnimatePresence>
              {routeInfo && (
                <motion.div
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -50, opacity: 0 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className="absolute top-[120px] sm:top-[72px] left-4 z-10 bg-white/95 backdrop-blur-sm border border-[#fa7150]/20 rounded-2xl p-4 shadow-xl flex items-center gap-4 text-left min-w-[320px]"
                >
                  <div className="space-y-1 flex-grow">
                    <p className="text-[10px] font-bold text-[#8a7e75] uppercase">
                      Độ dài tuyến đường
                    </p>

                    <p className="text-xs font-black text-[#303330] flex items-center gap-1">
                      <Compass size={14} className="text-[#fa7150]" />
                      {routeInfo.distance} ({routeInfo.duration})
                    </p>

                    <p className="text-[10px] font-bold text-[#8a7e75]">
                      Tìm thấy {filteredHotelsList.length} địa điểm
                    </p>
                  </div>

                  <button
                    onClick={startMotorbikeMoving}
                    disabled={isMoving}
                    className={`px-4 py-2 rounded-full text-xs font-black text-white shadow-md transition-all whitespace-nowrap ${isMoving
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-[#fa7150] hover:bg-[#a43e24] active:scale-95'
                      }`}
                  >
                    {isMoving ? 'Đang di chuyển...' : 'Bắt đầu di chuyển'}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {loading && (
              <div className="absolute top-[120px] sm:top-[72px] right-4 z-10 bg-white/95 border border-[#e1e3df] rounded-2xl px-4 py-3 shadow-lg text-xs font-bold text-[#303330]">
                Đang xử lý...
              </div>
            )}

            {error && (
              <div className="absolute top-[120px] sm:top-[72px] left-4 z-10 bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl text-xs font-bold flex items-start gap-2 text-left shadow-lg max-w-sm">
                <AlertTriangle
                  size={16}
                  className="shrink-0 text-rose-500 mt-0.5"
                />

                <div className="flex-grow">
                  <span>{error}</span>

                  <button
                    onClick={() => setError(null)}
                    className="block mt-1 text-rose-400 hover:text-rose-600 text-[9px] cursor-pointer underline"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={geolocateUser}
              className="absolute bottom-28 right-4 w-12 h-12 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all z-20 cursor-pointer"
              style={{
                background:
                  'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                boxShadow: '0 4px 20px rgba(109,40,217,0.45)'
              }}
              title="Lấy vị trí GPS hiện tại"
            >
              <Locate size={22} className="text-white" />
            </button>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-md border border-white/60 shadow-lg px-3 py-1.5 rounded-full flex items-center gap-2 z-10 pointer-events-none">
              <span className="w-2 h-2 rounded-full bg-[#fa7150] animate-pulse" />
              <span className="text-[10px] font-bold text-[#303330] tracking-wide">
                Goong Maps
              </span>
            </div>
          </main>
        </div>
      </div>

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

        .motorbike-marker {
          width: 42px;
          height: 42px;
          font-size: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          transform-origin: center center;
          transition: transform 0.15s linear;
          filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.35));
          z-index: 9999;
        }

        .goong-hotel-marker {
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>
    </div>
  )
}
