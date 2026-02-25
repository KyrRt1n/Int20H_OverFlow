import React from 'react';

export const ManualOrderForm = () => {
  return (
    <div className="brutal-card" style={{ background: 'var(--yellow)' }}>
      <h3 style={{ margin: '0 0 20px 0', textTransform: 'uppercase', fontSize: '24px' }}>Add_New_Log</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input type="text" placeholder="OBJECT_IDENTIFIER" />
        <input type="text" placeholder="DESTINATION_NODE" />
        <button className="brutal-btn" style={{ width: '100%', fontSize: '20px', background: 'var(--blue)', color: 'white' }}>
          Execute_Order_ +
        </button>
      </div>
    </div>
  );
};