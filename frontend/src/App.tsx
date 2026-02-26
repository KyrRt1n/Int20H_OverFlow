import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Виправлення багу з іконками Leaflet у React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Інтерфейс для даних (щоб не було помилки "any")
interface LocationData {
    id: number;
    name: string;
    lat: number;
    lng: number;
}

function App() {
    const [locations, setLocations] = useState<LocationData[]>([]);
    const position: [number, number] = [50.4501, 30.5234]; // Координати Києва

    useEffect(() => {
        // Приклад запиту через axios
        axios.get('https://api.example.com/locations')
            .then(response => {
                setLocations(response.data);
            })
            .catch(error => {
                console.error("Помилка при завантаженні даних:", error);
            });
    }, []);

    return (
        <div style={{ height: '100vh', width: '100%' }}>
            <MapContainer
                center={position}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {locations.map(loc => (
                    <Marker key={loc.id} position={[loc.lat, loc.lng]}>
                        <Popup>
                            {loc.name}
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}

export default App;