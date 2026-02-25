// src/MapComponent.tsx
import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Transaction } from './types';

// Фікс для іконок маркерів у Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

interface MapComponentProps {
    data: Transaction[];
}

const MapComponent: React.FC<MapComponentProps> = ({ data }) => {
    // Центруємо карту по першій точці (або Нью-Йорк за замовчуванням)
    const defaultCenter: [number, number] = data.length > 0
        ? [data[0].latitude, data[0].longitude]
        : [40.7128, -74.0060];

    return (
        <MapContainer center={defaultCenter} zoom={11} style={{ height: '100%', width: '100%' }}>
            <TileLayer
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                attribution='&copy; OpenStreetMap contributors'
            />

            {data.map((point) => (
                <Marker key={point.id} position={[point.latitude, point.longitude]}>
                    <Popup>
                        <div>
                            <strong>ID транзакції:</strong> {point.id} <br />
                            <strong>Сума:</strong> ${point.subtotal} <br />
                            <strong>Дата:</strong> {new Date(point.timestamp).toLocaleString()}
                        </div>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
};

export default MapComponent;