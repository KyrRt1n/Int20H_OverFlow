import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Фікс іконок Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

interface TaxBreakdown {
    state_rate: number;
    county_rate: number;
    city_rate: number;
    special_rates: number;
}

interface Order {
    id: number;
    longitude: number;
    latitude: number;
    timestamp: string;
    subtotal: number;
    composite_tax_rate: number;
    tax_amount: number;
    total_amount: number;
    breakdown: TaxBreakdown;
    jurisdictions: string[];
}

function App() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Зміни порт на той, де працює твій бекенд (наприклад, 5000)
        axios.get<Order[]>('http://localhost:5000/api/orders')
            .then(res => {
                setOrders(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-medium tracking-wide">Завантаження даних системи...</p>
                </div>
            </div>
        );
    }

    const totalRevenue = orders.reduce((sum, o) => sum + o.total_amount, 0);
    const totalTax = orders.reduce((sum, o) => sum + o.tax_amount, 0);
    const center: [number, number] = orders.length > 0 ? [orders[0].latitude, orders[0].longitude] : [42.0, -75.0];

    return (
        <div className="flex h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-100">

            {/* САЙДБАР */}
            <aside className="w-[340px] bg-white border-r border-slate-200 flex flex-col z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
                <div className="p-8 border-b border-slate-100">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-200">
                            <span className="text-white font-bold text-xl">B</span>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">BetterMe</h1>
                    </div>
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Drone Delivery Tax</p>
                </div>

                <div className="p-6 flex-1 overflow-y-auto space-y-5">
                    {/* Картка 1: Deliveries */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            <h3 className="text-sm font-semibold text-slate-500">Total Deliveries</h3>
                        </div>
                        <p className="text-4xl font-extrabold text-slate-800">{orders.length}</p>
                    </div>

                    {/* Картка 2: Taxes */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-bl-full -z-10"></div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                            <h3 className="text-sm font-semibold text-slate-500">Taxes Collected</h3>
                        </div>
                        <p className="text-4xl font-extrabold text-rose-600">
                            <span className="text-2xl text-rose-300 mr-1">$</span>
                            {totalTax.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </div>

                    {/* Картка 3: Revenue */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -z-10"></div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            <h3 className="text-sm font-semibold text-slate-500">Total Revenue</h3>
                        </div>
                        <p className="text-4xl font-extrabold text-emerald-600">
                            <span className="text-2xl text-emerald-300 mr-1">$</span>
                            {totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50/50">
                    <p className="text-xs text-slate-400 text-center">New York State Jurisdiction</p>
                </div>
            </aside>

            {/* ГОЛОВНИЙ КОНТЕНТ */}
            <main className="flex-1 flex flex-col relative overflow-hidden">

                {/* КАРТА */}
                <div className="h-[45%] w-full relative z-0 border-b border-slate-200">
                    <MapContainer center={center} zoom={7} style={{ height: '100%', width: '100%' }}>
                        {/* Використовуємо світлу і чисту тему карти (CartoDB Positron) */}
                        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                        {orders.slice(0, 150).map(o => (
                            <Marker key={o.id} position={[o.latitude, o.longitude]}>
                                <Popup className="rounded-xl">
                                    <div className="p-1">
                                        <p className="text-xs text-slate-400 uppercase font-bold mb-1">Order #{o.id}</p>
                                        <p className="text-sm">Tax: <span className="font-bold text-rose-500">${o.tax_amount.toFixed(2)}</span></p>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>
                </div>

                {/* ТАБЛИЦЯ ПОДАТКІВ */}
                <div className="h-[55%] overflow-auto p-8 bg-slate-50">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50/80 backdrop-blur-md sticky top-0 z-10 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Order ID</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Subtotal</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Tax Rate</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Tax Amt</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Total</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Breakdown</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Jurisdictions</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                            {orders.map(o => (
                                <tr key={o.id} className="hover:bg-slate-50/80 transition-colors group">
                                    <td className="px-6 py-4 text-sm font-semibold text-slate-700">#{o.id}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600">${o.subtotal.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-sm font-medium text-rose-500">
                      <span className="bg-rose-50 text-rose-600 px-2 py-1 rounded-md">
                        {(o.composite_tax_rate * 100).toFixed(3)}%
                      </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-rose-600">${o.tax_amount.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-sm font-bold text-emerald-600">${o.total_amount.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-xs text-slate-500 space-y-1">
                                        <div className="flex justify-between w-32"><span className="text-slate-400">State:</span> <span className="font-medium text-slate-600">{(o.breakdown.state_rate*100).toFixed(2)}%</span></div>
                                        <div className="flex justify-between w-32"><span className="text-slate-400">County:</span> <span className="font-medium text-slate-600">{(o.breakdown.county_rate*100).toFixed(3)}%</span></div>
                                        <div className="flex justify-between w-32"><span className="text-slate-400">City:</span> <span className="font-medium text-slate-600">{(o.breakdown.city_rate*100).toFixed(2)}%</span></div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-2">
                                            {o.jurisdictions.map(j => (
                                                <span key={j} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {j}
                          </span>
                                            ))}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </main>
        </div>
    );
}

export default App;