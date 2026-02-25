import React from 'react';
import { OrdersTable } from './components/OrdersTable';
import { ManualOrderForm } from './components/ManualOrderForm';
import { ImportCsvModal } from './components/ImportCsvModal';

function App() {
  return (
    <div style={{ padding: '40px' }}>
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '10px solid black',
        marginBottom: '40px',
        paddingBottom: '20px'
      }}>
        <h1 style={{ fontSize: '72px', margin: 0, textTransform: 'uppercase', fontWeight: 900, letterSpacing: '-4px' }}>
          CARGO_OS
        </h1>
        <ImportCsvModal />
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '40px' }}>
        <section>
          <OrdersTable />
        </section>
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          <ManualOrderForm />
          <div className="brutal-card" style={{ background: 'var(--blue)', color: 'white' }}>
            <h3 style={{ marginTop: 0 }}>SYSTEM_STATUS: OK</h3>
            <p>Connection: Stable</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default App;