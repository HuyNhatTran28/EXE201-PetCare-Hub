import { useRef, useEffect, useState, useCallback, useContext } from "react";
import { createRoot } from "react-dom/client";
import goongjs from "@goongmaps/goong-js";
import "@goongmaps/goong-js/dist/goong-js.css";
import { Input, Button, AutoComplete } from "antd";
import {
  SearchOutlined,
  UnorderedListOutlined,
  AimOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";
import { MdSportsTennis, MdSportsVolleyball } from "react-icons/md";
import { IoFootball } from "react-icons/io5";
import { GiShuttlecock } from "react-icons/gi";
import { useNavigate } from "react-router-dom";

import rentalService from "../../../service/rental/rentalService";
import { CategoryContext } from "../../../context/CategoryContext";

goongjs.accessToken = import.meta.env.VITE_GOONG_TOKEN;
const GOONG_API_KEY = import.meta.env.VITE_GOONG_API_KEY;

interface RentalAreaMap {
  rentalAreaId: string;
  rentalAreaName: string;
  latitude: number;
  longitude: number;
  address: { street: string; ward: string; cityName?: string };
  courtResponses?: {
    category?: {
      categoryId: number;
      categoryName: string;
    };
  }[];
}

const AreaMapGoong = () => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const navigate = useNavigate();

  const [lng] = useState(106.65421);
  const [lat] = useState(10.80155);
  const [zoom] = useState(13);

  const [activeFilter, setActiveFilter] = useState("Tất cả");
  const [allAreas, setAllAreas] = useState<RentalAreaMap[]>([]);

  const [searchOptions, setSearchOptions] = useState<
    { value: string; label: string; place_id: string }[]
  >([]);
  const [searchValue, setSearchValue] = useState("");

  const userMarkerRef = useRef<any>(null);

  const { categories: apiCategories } = useContext(CategoryContext);

  const fetchAllAreas = useCallback(async () => {
    try {
      const resData = await rentalService.getAllRentalAreas(
        1,
        1000,
        undefined,
        undefined,
        undefined,
        undefined,
      );

      if (resData.code === 200 && resData.result?.data) {
        setAllAreas(resData.result.data);
      }
    } catch (error) {
      console.error("Lỗi khi fetch dữ liệu sân:", error);
    }
  }, []);

  const getCategoryTheme = (area: RentalAreaMap) => {
    const categoryName =
      area.courtResponses?.[0]?.category?.categoryName?.toLowerCase() || "";

    if (categoryName.includes("cầu lông"))
      return { color: "#f97316", icon: <GiShuttlecock /> };
    if (categoryName.includes("pickleball"))
      return { color: "#9333ea", icon: <MdSportsTennis /> };
    if (categoryName.includes("bóng đá"))
      return { color: "#22c55e", icon: <IoFootball /> };
    if (categoryName.includes("quần vợt"))
      return { color: "#eab308", icon: <MdSportsTennis /> };
    if (categoryName.includes("bóng chuyền"))
      return { color: "#3b82f6", icon: <MdSportsVolleyball /> };

    return { color: "#6b7280", icon: <EnvironmentOutlined /> };
  };

  const renderMarkers = useCallback(
    (areas: RentalAreaMap[]) => {
      const currentMap = map.current;
      if (!currentMap) return;

      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      areas.forEach((area) => {
        if (!area.latitude || !area.longitude) return;

        const theme = getCategoryTheme(area);

        const markerNode = document.createElement("div");
        const markerRoot = createRoot(markerNode);

        markerRoot.render(
          <div
            className="custom-marker"
            style={{
              backgroundColor: theme.color,
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              border: "2px solid white",
              boxShadow: "0 2px 4px rgba(0,0,0,0.4)",
              cursor: "pointer",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontSize: "18px",
              color: "white",
              transition: "transform 0.2s ease",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.transform = "scale(1.15)")
            }
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            {theme.icon}
          </div>,
        );

        const popupNode = document.createElement("div");
        const popupRoot = createRoot(popupNode);

        popupRoot.render(
          <div style={{ padding: "5px", minWidth: "160px" }}>
            <h4
              style={{
                margin: "0 0 5px 0",
                color: theme.color,
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {theme.icon} <span>{area.rentalAreaName}</span>
            </h4>
            <p
              style={{ margin: "0 0 10px 0", fontSize: "12px", color: "#666" }}
            >
              {area.address?.street || ""} {area.address?.ward || ""}
            </p>
            <Button
              type="primary"
              block
              style={{
                backgroundColor: theme.color,
                borderColor: theme.color,
                fontWeight: "bold",
              }}
              onClick={() => navigate(`/rental-area/${area.rentalAreaId}`)}
            >
              Xem chi tiết
            </Button>
          </div>,
        );

        const popup = new goongjs.Popup({ offset: 25 }).setDOMContent(
          popupNode,
        );

        const marker = new goongjs.Marker(markerNode)
          .setLngLat([area.longitude, area.latitude])
          .setPopup(popup)
          .addTo(currentMap);

        markersRef.current.push(marker);
      });
    },
    [navigate],
  );

  const handleSearchInput = async (searchText: string) => {
    setSearchValue(searchText);
    if (!searchText) {
      setSearchOptions([]);
      return;
    }

    try {
      const res = await fetch(
        `https://rsapi.goong.io/Place/AutoComplete?api_key=${GOONG_API_KEY}&input=${searchText}`,
      );
      const data = await res.json();

      if (data.status === "OK") {
        const options = data.predictions.map((item: any) => ({
          value: item.description,
          label: item.description,
          place_id: item.place_id,
        }));
        setSearchOptions(options);
      }
    } catch (error) {
      console.error("Lỗi tìm kiếm Goong:", error);
    }
  };

  const handleSelectLocation = async (_value: string, option: any) => {
    try {
      const res = await fetch(
        `https://rsapi.goong.io/Place/Detail?api_key=${GOONG_API_KEY}&place_id=${option.place_id}`,
      );
      const data = await res.json();

      if (data.status === "OK") {
        const location = data.result.geometry.location;
        const newLng = location.lng;
        const newLat = location.lat;

        if (map.current) {
          map.current.flyTo({
            center: [newLng, newLat],
            zoom: 15,
            essential: true,
          });
        }
      }
    } catch (error) {
      console.error("Lỗi lấy tọa độ:", error);
    }
  };

  const handleMyLocation = () => {
    if (!navigator.geolocation) {
      alert("Trình duyệt của bạn không hỗ trợ chức năng định vị!");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { longitude, latitude } = position.coords;

        if (!longitude || !latitude || isNaN(longitude) || isNaN(latitude)) {
          return;
        }

        if (map.current) {
          if (userMarkerRef.current) {
            userMarkerRef.current.remove();
          }

          const userDot = document.createElement("div");
          userDot.className = "user-location-dot";
          userDot.style.width = "20px";
          userDot.style.height = "20px";
          userDot.style.backgroundColor = "#1d4ed8";
          userDot.style.borderRadius = "50%";
          userDot.style.border = "3px solid white";
          userDot.style.boxShadow = "0 0 10px rgba(0,0,0,0.5)";

          userMarkerRef.current = new goongjs.Marker({ element: userDot })
            .setLngLat([longitude, latitude])
            .addTo(map.current);

          map.current.flyTo({
            center: [longitude, latitude],
            zoom: 15,
            essential: true,
          });
        }
      },
      (error) => {
        console.error("Lỗi định vị chi tiết:", error);

        if (error.code === error.PERMISSION_DENIED) {
          alert(
            "Bạn đã chặn quyền truy cập vị trí. Vui lòng bật lại trong cài đặt trình duyệt (biểu tượng ổ khóa trên thanh địa chỉ).",
          );
        } else {
          alert(
            "Không thể lấy được vị trí (Lỗi mạng hoặc Timeout). Bạn thử lại sau nhé!",
          );
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 60000,
      },
    );
  };

  useEffect(() => {
    let filteredAreas = allAreas;

    if (activeFilter !== "Tất cả") {
      filteredAreas = allAreas.filter((area) => {
        if (!area.courtResponses || area.courtResponses.length === 0)
          return false;
        return area.courtResponses.some((court) =>
          court.category?.categoryName
            .toLowerCase()
            .includes(activeFilter.toLowerCase()),
        );
      });
    }

    renderMarkers(filteredAreas);
  }, [allAreas, activeFilter, renderMarkers]);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new goongjs.Map({
      container: mapContainer.current,
      style: "https://tiles.goong.io/assets/goong_map_web.json",
      center: [lng, lat],
      zoom: zoom,
    });

    map.current.on("load", () => {
      if (map.current) {
        if (map.current.getLayer("poi-tree")) {
          map.current.removeLayer("poi-tree");
        }

        const layers = map.current.getStyle().layers;
        layers.forEach((layer: any) => {
          if (layer.id.includes("poi")) {
            map.current.setLayoutProperty(layer.id, "visibility", "none");
          }
        });

        fetchAllAreas();
      }
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [fetchAllAreas]);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "calc(100vh - 80px)",
        overflow: "hidden",
      }}
    >
      <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />

      <div
        style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          right: "20px",
          display: "flex",
          gap: "15px",
          zIndex: 10,
          alignItems: "center",
        }}
      >
        <AutoComplete
          options={searchOptions}
          onSearch={handleSearchInput}
          onSelect={handleSelectLocation}
          value={searchValue}
          onChange={setSearchValue}
          style={{ width: "350px" }}
        >
          <Input
            prefix={
              <SearchOutlined style={{ color: "#f97316", fontSize: "16px" }} />
            }
            placeholder="Tìm kiếm khu vực, tên đường..."
            style={{
              borderRadius: "30px",
              padding: "10px 20px",
              border: "none",
              boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
              fontSize: "15px",
            }}
          />
        </AutoComplete>

        <div
          style={{
            display: "flex",
            gap: "10px",
            overflowX: "auto",
            paddingBottom: "5px",
            scrollbarWidth: "none",
          }}
        >
          <Button
            type={activeFilter === "Tất cả" ? "primary" : "default"}
            onClick={() => setActiveFilter("Tất cả")}
            style={{
              borderRadius: "30px",
              height: "auto",
              padding: "8px 16px",
              backgroundColor: activeFilter === "Tất cả" ? "white" : "white",
              borderColor: activeFilter === "Tất cả" ? "#f97316" : "#e5e7eb",
              color: activeFilter === "Tất cả" ? "#f97316" : "#4b5563",
              fontWeight: activeFilter === "Tất cả" ? "bold" : "normal",
              boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
            }}
          >
            Tất cả
          </Button>

          {apiCategories.map((cat) => (
            <Button
              key={cat.categoryId}
              type={activeFilter === cat.categoryName ? "primary" : "default"}
              onClick={() => setActiveFilter(cat.categoryName)}
              style={{
                borderRadius: "30px",
                height: "auto",
                padding: "8px 16px",
                backgroundColor:
                  activeFilter === cat.categoryName ? "white" : "white",
                borderColor:
                  activeFilter === cat.categoryName ? "#f97316" : "#e5e7eb",
                color:
                  activeFilter === cat.categoryName ? "#f97316" : "#4b5563",
                fontWeight:
                  activeFilter === cat.categoryName ? "bold" : "normal",
                boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
              }}
            >
              {cat.categoryName}
            </Button>
          ))}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: "30px",
          right: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "15px",
          zIndex: 10,
        }}
      >
        <Button
          type="primary"
          shape="circle"
          icon={<UnorderedListOutlined />}
          size="large"
          style={{
            width: "50px",
            height: "50px",
            backgroundColor: "#9333ea",
            borderColor: "#9333ea",
            boxShadow: "0 4px 6px rgba(0,0,0,0.2)",
            fontSize: "20px",
          }}
        />
        <Button
          shape="circle"
          icon={<AimOutlined />}
          size="large"
          onClick={handleMyLocation}
          style={{
            width: "50px",
            height: "50px",
            color: "#9333ea",
            border: "none",
            boxShadow: "0 4px 6px rgba(0,0,0,0.2)",
            fontSize: "20px",
          }}
        />
      </div>
    </div>
  );
};

export default AreaMapGoong;
