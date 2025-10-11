import { useEffect, useState } from 'react';
import axios from 'axios';

type FuelType = { id: number; name: string; price: number | null };
type CombinedRow = Record<string, number> & { date: string };

function today() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export default function Prices() {
  const [activeTab, setActiveTab] = useState<'set' | 'history'>('set');
  const [fuelTypes, setFuelTypes] = useState<FuelType[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [date, setDate] = useState<string>(today());
  const [rows, setRows] = useState<CombinedRow[]>([]);
  const [current, setCurrent] = useState<Record<string, number | null> & { updatedAt: string | null }>({ updatedAt: null });
  const [pageSize, setPageSize] = useState<number>(10);
  const [page, setPage] = useState<number>(1);

  async function load() {
    try {
      const [combinedRes, currentRes, fuelTypesRes] = await Promise.all([
        axios.get('/api/prices/combined'),
        axios.get('/api/prices/current'),
        axios.get('/api/tanks')
      ]);
      
      setRows(combinedRes.data);
      setCurrent(currentRes.data);
      
      // Extract unique fuel types from tanks
      const uniqueFuelTypes = new Map<number, { id: number; name: string; price: number | null }>();
      fuelTypesRes.data.forEach((tank: any) => {
        if (tank.fuelType) {
          const key = tank.fuelType.name.toLowerCase().replace(/\s+/g, '');
          uniqueFuelTypes.set(tank.fuelTypeId, {
            id: tank.fuelTypeId,
            name: tank.fuelType.name,
            price: currentRes.data[key] || null
          });
        }
      });
      
      setFuelTypes(Array.from(uniqueFuelTypes.values()));
    } catch (error) {
      console.error('Error loading prices:', error);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const allFilled = fuelTypes.every(ft => {
    const key = ft.name.toLowerCase().replace(/\s+/g, '');
    return prices[key] !== undefined && prices[key] !== null && !isNaN(prices[key]);
  });
  
  async function saveAll() {
    if (!allFilled) return;
    await axios.post('/api/prices/set', { prices, date });
    setPrices({});
    await load();
  }

  return (
    <div className="space-y-8">
      {/* Premium Header */}
      <div className="premium-card">
        <div className="premium-card-header">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="premium-heading-1 premium-gradient-text">Fuel Price Management</h1>
              <p className="premium-text-large text-slate-600 mt-2">
                Set current prices and track historical changes
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="premium-badge premium-badge-primary">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Live Prices
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Premium Tabs */}
      <div className="premium-card">
        <div className="premium-card-body">
          <div className="flex space-x-1 mb-8 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('set')}
              className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all duration-200 ${
                activeTab === 'set' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
              </svg>
              Set Prices
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all duration-200 ${
                activeTab === 'history' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Price History
            </button>
          </div>

      {activeTab === 'set' && (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {fuelTypes.map((fuelType, index) => {
              const key = fuelType.name.toLowerCase().replace(/\s+/g, '');
              const colors = [
                { bg: 'bg-blue-100', text: 'text-blue-600' },
                { bg: 'bg-emerald-100', text: 'text-emerald-600' },
                { bg: 'bg-slate-100', text: 'text-slate-600' },
                { bg: 'bg-amber-100', text: 'text-amber-600' },
                { bg: 'bg-purple-100', text: 'text-purple-600' },
                { bg: 'bg-pink-100', text: 'text-pink-600' }
              ];
              const color = colors[index % colors.length];
              
              return (
                <div key={fuelType.id} className="metric-card">
                  <div className="flex items-center">
                    <div className={`p-3 ${color.bg} rounded-lg`}>
                      <svg className={`w-6 h-6 ${color.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="metric-label">{fuelType.name}</p>
                      <p className="metric-value">₹{current[key]?.toFixed(2) ?? 'N/A'}</p>
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="metric-card">
              <div className="flex items-center">
                <div className="p-3 bg-amber-100 rounded-lg">
                  <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="metric-label">Last Updated</p>
                  <p className="text-sm text-slate-600">{current.updatedAt ? new Date(current.updatedAt).toLocaleDateString() : 'Never'}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="card max-w-2xl">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-slate-900">Set New Prices</h2>
            </div>
            <div className="card-body">
              <div className="grid md:grid-cols-3 gap-6">
                {fuelTypes.map(fuelType => {
                  const key = fuelType.name.toLowerCase().replace(/\s+/g, '');
                  return (
                    <div key={fuelType.id} className="form-group">
                      <label className="form-label">{fuelType.name} Price (₹/L)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={prices[key] ?? ''}
                        onChange={e => setPrices(prev => ({
                          ...prev,
                          [key]: e.target.value === '' ? undefined : Number(e.target.value)
                        }))}
                        className="input-field"
                        placeholder={`Enter ${fuelType.name.toLowerCase()} price`}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="form-group">
                <label className="form-label">Effective Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="input-field"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={saveAll}
                  disabled={!allFilled}
                  className={`btn-primary flex-1 ${
                    !allFilled ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  Update Prices
                </button>
                <button
                  onClick={() => setPrices({})}
                  className="btn-ghost"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Price History</h2>
              <div className="flex items-center gap-3">
                <label className="text-sm">Rows per page</label>
                <select className="border rounded p-2" value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[600px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  {fuelTypes.map(fuelType => (
                    <th key={fuelType.id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {fuelType.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginate(rows, page, pageSize).map((r, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(r.date).toLocaleString()}</td>
                    {fuelTypes.map(fuelType => {
                      const key = fuelType.name.toLowerCase().replace(/\s+/g, '');
                      const value = r[key];
                      return (
                        <td key={fuelType.id} className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {value !== undefined && value !== null ? `₹${Number(value).toFixed(2)}` : '-'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-6 py-3 border-t text-sm">
            <div>Page {page} of {Math.max(1, Math.ceil(rows.length / pageSize))}</div>
            <div className="flex gap-2">
              <button className="px-3 py-1 border rounded-lg hover:bg-gray-50" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</button>
              <button className="px-3 py-1 border rounded-lg hover:bg-gray-50" disabled={page >= Math.ceil(rows.length / pageSize)} onClick={() => setPage(p => Math.min(Math.ceil(rows.length / pageSize), p + 1))}>Next</button>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
}


