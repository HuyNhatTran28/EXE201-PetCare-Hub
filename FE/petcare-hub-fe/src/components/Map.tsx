import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Sửa lỗi hiển thị icon marker của Leaflet trong môi trường Vite/Webpack
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})

interface MapProps {
  lat: number
  lng: number
  onChange?: (lat: number, lng: number) => void
  readonly?: boolean
  height?: string
}

export const Map = ({ lat, lng, onChange, readonly = false, height = '300px' }: MapProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)

  // Đồng bộ hóa vị trí marker khi lat/lng từ parent thay đổi
  useEffect(() => {
    if (mapRef.current && markerRef.current) {
      const newLatLng = L.latLng(lat, lng)
      markerRef.current.setLatLng(newLatLng)
      mapRef.current.panTo(newLatLng)
    }
  }, [lat, lng])

  useEffect(() => {
    if (!mapContainerRef.current) return

    // Khởi tạo Map
    const map = L.map(mapContainerRef.current).setView([lat, lng], 15)
    mapRef.current = map

    // Thêm TileLayer (sử dụng OpenStreetMap tiles miễn phí)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map)

    // Khởi tạo Marker
    const marker = L.marker([lat, lng], {
      draggable: !readonly
    }).addTo(map)
    markerRef.current = marker

    // Sự kiện kéo thả marker (nếu không readonly)
    if (!readonly && onChange) {
      marker.on('dragend', () => {
        const position = marker.getLatLng()
        onChange(position.lat, position.lng)
      })

      // Click vào vị trí bất kỳ trên bản đồ để di chuyển marker
      map.on('click', (e) => {
        marker.setLatLng(e.latlng)
        onChange(e.latlng.lat, e.latlng.lng)
      })
    }

    // Dọn dẹp map khi component unmount
    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [readonly])

  return (
    <div 
      ref={mapContainerRef} 
      style={{ height, width: '100%' }} 
      className="rounded-2xl overflow-hidden border border-[#e5d8d0] shadow-sm z-10"
    />
  )
}
