import React from 'react';

export const OrdersTable = () => {
  const orders = [
    { id: '0764', name: 'Drone_X1_Unit', status: 'READY' },
    { id: '0713', name: 'Power_Cell_V8', status: 'PENDING' },
  ];

  return (
    <div>
      <h2 style={{ textTransform: 'uppercase', background: 'black', color: 'white', display: 'inline-block', padding: '5px 15px', marginBottom: '20px' }}>
        Live_Monitor_v1.0
      </h2>
      {orders.map(order => (
        <div key={order.id} className="brutal-card" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '24px', fontWeight: 900 }}>#{order.id} / {order.name}</span>
          <span style={{
            background: order.status === 'READY' ? 'var(--lime)' : 'var(--yellow)',
            border: '3px solid black',
            padding: '5px 15px',
            fontWeight: '900'
          }}>
            {order.status}
          </span>
        </div>
      ))}
    </div>
  );
};