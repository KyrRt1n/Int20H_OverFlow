// src/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { ProcessedOrder } from './types';

const Dashboard: React.FC = () => {
    const [orders, setOrders] = useState<ProcessedOrder[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // Simulation of data loading from backend
    useEffect(() => {
        const fetchOrders = async () => {
            try {
                // In a real project it would be: await fetch('http://localhost:3000/orders')
                // For now use mock data to show UI look
                const mockData: ProcessedOrder[] = [
                    {
                        id: 1,
                        longitude: -78.8671866447861,
                        latitude: 42.01246326237433,
                        timestamp: "2025-11-04 10:17:04",
                        subtotal: 120.0,
                        composite_tax_rate: 0.08875,
                        tax_amount: 10.65,
                        total_amount: 130.65,
                        breakdown: {
                            state_rate: 0.04,
                            county_rate: 0.04875,
                            city_rate: 0,
                            special_rates: 0
                        },
                        jurisdictions: ["New York State", "Erie County"]
                    },
                    // Add more mock data as needed...
                ];

                // Network delay imitation
                setTimeout(() => {
                    setOrders(mockData);
                    setIsLoading(false);
                }, 1000);
            } catch (error) {
                console.error("Data loading error", error);
                setIsLoading(false);
            }
        };

        fetchOrders();
    }, []);

    // Total statistics calculation
    const totalRevenue = orders.reduce((sum, order) => sum + order.total_amount, 0);
    const totalTaxes = orders.reduce((sum, order) => sum + order.tax_amount, 0);

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen">Loading tax system data...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8 font-sans">
            <div className="max-w-7xl mx-auto">

                {/* Header */}
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">BetterMe: Instant Wellness Kits</h1>
                    <p className="text-gray-500 mt-2">Administration and tax report panel (New York State)</p>
                </header>

                {/* Statistics widgets */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Number of deliveries</h3>
                        <p className="text-3xl font-bold text-gray-900">{orders.length}</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Total taxes collected</h3>
                        <p className="text-3xl font-bold text-red-600">${totalTaxes.toFixed(2)}</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Total revenue</h3>
                        <p className="text-3xl font-bold text-green-600">${totalRevenue.toFixed(2)}</p>
                    </div>
                </div>

                {/* Orders table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                            <tr className="bg-gray-50 text-gray-600 text-sm border-b border-gray-200">
                                <th className="p-4 font-semibold">ID</th>
                                <th className="p-4 font-semibold">Date</th>
                                <th className="p-4 font-semibold">Subtotal</th>
                                <th className="p-4 font-semibold text-red-600">Tax Rate</th>
                                <th className="p-4 font-semibold text-red-600">Tax Amount</th>
                                <th className="p-4 font-semibold text-green-600">Total</th>
                                <th className="p-4 font-semibold">Tax breakdown</th>
                                <th className="p-4 font-semibold">Jurisdictions</th>
                            </tr>
                            </thead>
                            <tbody className="text-sm">
                            {orders.map((order) => (
                                <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                    <td className="p-4 text-gray-900 font-medium">#{order.id}</td>
                                    <td className="p-4 text-gray-500">{new Date(order.timestamp).toLocaleString()}</td>
                                    <td className="p-4">${order.subtotal.toFixed(2)}</td>
                                    <td className="p-4 bg-red-50 text-red-700">{(order.composite_tax_rate * 100).toFixed(3)}%</td>
                                    <td className="p-4 bg-red-50 text-red-700 font-medium">${order.tax_amount.toFixed(2)}</td>
                                    <td className="p-4 bg-green-50 text-green-700 font-bold">${order.total_amount.toFixed(2)}</td>
                                    <td className="p-4 text-xs text-gray-500">
                                        <div>State: {(order.breakdown.state_rate * 100).toFixed(2)}%</div>
                                        <div>County: {(order.breakdown.county_rate * 100).toFixed(3)}%</div>
                                        <div>City: {(order.breakdown.city_rate * 100).toFixed(2)}%</div>
                                        <div>Special: {(order.breakdown.special_rates * 100).toFixed(2)}%</div>
                                    </td>
                                    <td className="p-4 text-xs text-gray-500">
                                        {order.jurisdictions.map((j, i) => (
                                            <span key={i} className="inline-block bg-gray-200 rounded px-2 py-1 m-1">{j}</span>
                                        ))}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Dashboard;