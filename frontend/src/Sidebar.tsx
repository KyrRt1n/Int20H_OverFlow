// src/Sidebar.tsx
import React from 'react';
import { Transaction } from './types';

interface SidebarProps {
    data: Transaction[];
}

const Sidebar: React.FC<SidebarProps> = ({ data }) => {
    const totalRevenue = data.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    const totalTransactions = data.length;

    return (
        <aside style={{
            width: '350px',
            backgroundColor: '#ffffff',
            padding: '24px',
            boxShadow: '2px 0 10px rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            zIndex: 1000 // Щоб панель була над картою
        }}>
            <h2 style={{ margin: 0, fontSize: '24px', color: '#111827' }}>Аналітика</h2>

            <div style={{ padding: '16px', backgroundColor: '#f3f4f6', borderRadius: '12px' }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>Кількість транзакцій</p>
                <p style={{ margin: '8px 0 0 0', fontSize: '32px', fontWeight: 'bold', color: '#111827' }}>
                    {totalTransactions}
                </p>
            </div>

            <div style={{ padding: '16px', backgroundColor: '#f3f4f6', borderRadius: '12px' }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>Загальний дохід</p>
                <p style={{ margin: '8px 0 0 0', fontSize: '32px', fontWeight: 'bold', color: '#10b981' }}>
                    ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
            </div>

            {/* Місце для майбутніх графіків */}
            <div style={{ flexGrow: 1, border: '2px dashed #e5e7eb', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                Місце для графіка
            </div>
        </aside>
    );
};

export default Sidebar;