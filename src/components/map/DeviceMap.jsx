import { useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { INITIAL_DEVICES } from "../../constants/config.js";
import { calculateDevicesCenter } from "../../utils/mapHelpers.js";
import { DeviceInfoModal } from "../DeviceInfoModal.jsx";
import { createDeviceIcon } from "./createDeviceIcon.js";

export function DeviceMap({ devices = INITIAL_DEVICES }) {
  const [selectedDevice, setSelectedDevice] = useState(null);

  const center = useMemo(() => calculateDevicesCenter(devices), [devices]);

  const deviceIcons = useMemo(() => {
    const icons = {};
    devices.forEach((device) => {
      icons[device.id] = createDeviceIcon(device);
    });
    return icons;
  }, [devices]);

  return (
    <>
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white">Mapa de Dispositivos</h3>
          <p className="text-sm text-slate-400">Clique nos dispositivos para ver detalhes</p>
        </div>

        <div className="relative h-[450px]">
          <MapContainer
            center={center}
            zoom={18}
            className="leaflet-map-container"
            zoomControl={true}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {devices.map((device) => (
              <Marker
                key={device.id}
                position={[device.lat, device.lng]}
                icon={deviceIcons[device.id]}
                eventHandlers={{
                  click: () => setSelectedDevice(device),
                }}
              />
            ))}
          </MapContainer>

          <div className="absolute bottom-4 left-4 z-[1000] bg-slate-900/90 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full map-legend-dot--critical" />
              <span className="text-xs text-slate-300">Crítico</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-xs text-slate-300">Alto</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-xs text-slate-300">Moderado</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-xs text-slate-300">Baixo</span>
            </div>
          </div>
        </div>
      </div>

      <DeviceInfoModal device={selectedDevice} onClose={() => setSelectedDevice(null)} />
    </>
  );
}
