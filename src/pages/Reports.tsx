import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';

type Summary = {
  period: string;
  start: string;
  end: string;
  totals: { litres: number; petrolLitres: number; dieselLitres: number; premiumPetrolLitres: number; revenue: number; profit: number };
  revenues: { petrolRevenue: number; dieselRevenue: number; premiumPetrolRevenue: number };
  financials: { totalRevenue: number; creditToCollect: number; moneyReceived: number; cashReceived: number; onlineReceived: number };
};

type PumpReading = {
  id: number;
  pumpId: number;
  pump?: { name?: string; fuelType?: { name?: string } };
  openingLitres: string;
  closingLitres: string;
  pricePerLitre: string;
};

type ClientCredit = {
  id: number;
  client?: { name?: string };
  fuelType?: { name?: string };
  litres: string;
  pricePerLitre: string;
  totalAmount: string;
  date: string;
};

export default function Reports() {
  const [period, setPeriod] = useState<'daily'|'weekly'|'monthly'|'yearly'>('daily');
  const [date, setDate] = useState<string>(today());
  const [summary, setSummary] = useState<Summary | null>(null);
  const [readings, setReadings] = useState<PumpReading[]>([]);
  const [credits, setCredits] = useState<ClientCredit[]>([]);
  const [showDetails, setShowDetails] = useState(false);

  async function load() {
    const params: any = { period };
    if (period === 'daily') params.date = date;
    const r = await axios.get('/api/reports/summary', { params });
    console.log('Reports data received:', r.data);
    setSummary(r.data);
    
    if (period === 'daily') {
      const readingsRes = await axios.get('/api/readings', { params: { date } });
      setReadings(readingsRes.data);
      
      // Load credits for the day using the credits endpoint with date filters
      const creditsRes = await axios.get('/api/credits', { 
        params: { startDate: date, endDate: date } 
      });
      setCredits(creditsRes.data);
    }
  }

  useEffect(() => { load(); }, [period, date]);

  function exportCSV() {
    if (!summary) return;
    const rows = [
      ['Metric', 'Value'],
      ['Total Litres', summary.totals.litres],
      ['Petrol Litres', summary.totals.petrolLitres],
      ['Petrol Revenue', summary.revenues.petrolRevenue],
      ['Diesel Litres', summary.totals.dieselLitres],
      ['Diesel Revenue', summary.revenues.dieselRevenue],
      ['Premium Petrol Litres', summary.totals.premiumPetrolLitres],
      ['Premium Petrol Revenue', summary.revenues.premiumPetrolRevenue],
      ['Total Revenue', summary.totals.revenue],
      ['Profit', summary.totals.profit],
      ['Money Received', summary.financials?.moneyReceived || 0],
      ['Credit to Collect', summary.financials?.creditToCollect || 0],
      ['Cash Received', summary.financials?.cashReceived || 0],
      ['Online Received', summary.financials?.onlineReceived || 0],
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${period}-${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const periodControls = useMemo(() => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <Select label="Period" value={period} onChange={e => setPeriod(e.target.value as any)}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </Select>
        </div>
        {period === 'daily' && (
          <div>
            <Input label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
        )}
        <div className="sm:col-span-2 lg:col-span-1">
          {period === 'daily' && (
            <Button variant="secondary" onClick={() => setShowDetails(!showDetails)} className="w-full">
              {showDetails ? 'Hide Details' : 'Show Details'}
            </Button>
          )}
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <Button onClick={load} className="btn-primary flex-1">Refresh</Button>
        <Button variant="secondary" onClick={exportCSV} className="btn-secondary flex-1">Export CSV</Button>
        <Button variant="ghost" onClick={() => window.print()} className="btn-ghost flex-1">Print</Button>
      </div>
    </div>
  ), [period, date, summary, showDetails]);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title text-2xl sm:text-3xl">Reports & Analytics</h1>
        <p className="page-subtitle text-sm sm:text-base">Comprehensive business insights and performance metrics</p>
      </div>

      {/* Controls */}
      <div className="card">
        <div className="card-body p-4 sm:p-6">
          {periodControls}
        </div>
      </div>
      
      {summary && (
        <div className="space-y-8">
          {/* Executive Dashboard */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-4 sm:p-8 text-white shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">Executive Dashboard</h1>
                <p className="text-slate-300 text-sm sm:text-base">Comprehensive business analytics and insights</p>
              </div>
              <div className="text-left sm:text-right">
                <div className="text-xs sm:text-sm text-slate-400">Period: {summary.period.toUpperCase()}</div>
                <div className="text-xs sm:text-sm text-slate-400">{new Date(summary.start).toLocaleDateString()} - {new Date(summary.end).toLocaleDateString()}</div>
              </div>
            </div>

            {/* Key Performance Indicators */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-300 text-sm font-medium">Total Revenue</p>
                    <p className="text-3xl font-bold text-white">₹{currency(summary.totals.revenue)}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-300 text-sm font-medium">Money Received</p>
                    <p className="text-3xl font-bold text-green-400">₹{currency(summary.financials?.moneyReceived)}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-300 text-sm font-medium">Credit to Collect</p>
                    <p className="text-3xl font-bold text-amber-400">₹{currency(summary.financials?.creditToCollect)}</p>
                  </div>
                  <div className="w-12 h-12 bg-amber-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-300 text-sm font-medium">Total Volume</p>
                    <p className="text-3xl font-bold text-purple-400">{summary.totals.litres.toFixed(0)}L</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sales Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Sales Breakdown */}
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
                <h3 className="text-xl font-bold text-white">Sales Performance</h3>
                <p className="text-blue-100">Volume and revenue breakdown by fuel type</p>
              </div>
              <div className="p-8">
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                    <div className="flex items-center space-x-4">
                      <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                      <div>
                        <p className="font-semibold text-slate-900">Petrol</p>
                        <p className="text-sm text-slate-600">{summary.totals.petrolLitres.toFixed(0)} litres sold</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-slate-900">₹{currency(summary.revenues.petrolRevenue)}</p>
                      <p className="text-sm text-slate-600">Revenue</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                    <div className="flex items-center space-x-4">
                      <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                      <div>
                        <p className="font-semibold text-slate-900">Diesel</p>
                        <p className="text-sm text-slate-600">{summary.totals.dieselLitres.toFixed(0)} litres sold</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-slate-900">₹{currency(summary.revenues.dieselRevenue)}</p>
                      <p className="text-sm text-slate-600">Revenue</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                    <div className="flex items-center space-x-4">
                      <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
                      <div>
                        <p className="font-semibold text-slate-900">Premium Petrol</p>
                        <p className="text-sm text-slate-600">{summary.totals.premiumPetrolLitres.toFixed(0)} litres sold</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-slate-900">₹{currency(summary.revenues.premiumPetrolRevenue)}</p>
                      <p className="text-sm text-slate-600">Revenue</p>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-6">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-slate-900">Total Volume</span>
                      <span className="text-2xl font-bold text-slate-900">{summary.totals.litres.toFixed(0)}L</span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-lg font-semibold text-slate-900">Total Revenue</span>
                      <span className="text-2xl font-bold text-blue-600">₹{currency(summary.totals.revenue)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Overview */}
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-8 py-6">
                <h3 className="text-xl font-bold text-white">Financial Overview</h3>
                <p className="text-emerald-100">Cash flow and credit management</p>
              </div>
              <div className="p-8">
                <div className="space-y-6">
                  <div className="text-center p-6 bg-green-50 rounded-xl border border-green-200">
                    <div className="text-4xl font-bold text-green-600 mb-2">₹{currency(summary.financials?.moneyReceived)}</div>
                    <div className="text-green-800 font-semibold">Money Received</div>
                    <div className="text-sm text-green-600 mt-1">Cash + Online Payments</div>
                  </div>

                  <div className="text-center p-6 bg-amber-50 rounded-xl border border-amber-200">
                    <div className="text-4xl font-bold text-amber-600 mb-2">₹{currency(summary.financials?.creditToCollect)}</div>
                    <div className="text-amber-800 font-semibold">Credit to Collect</div>
                    <div className="text-sm text-amber-600 mt-1">Outstanding payments</div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <div className="text-center p-4 bg-slate-50 rounded-lg">
                      <div className="text-2xl font-bold text-slate-900">₹{currency(summary.financials?.cashReceived)}</div>
                      <div className="text-sm text-slate-600">Cash</div>
                    </div>
                    <div className="text-center p-4 bg-slate-50 rounded-lg">
                      <div className="text-2xl font-bold text-slate-900">₹{currency(summary.financials?.onlineReceived)}</div>
                      <div className="text-sm text-slate-600">Online</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDetails && period === 'daily' && (
        <div className="space-y-8">
          {/* Tank Readings */}
          <div className="table-container">
            <div className="table-header">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Pump Readings - {new Date(date).toLocaleDateString()}</h2>
                <div className="text-sm text-slate-500">
                  {readings.length} reading{readings.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="table-header">Pump</th>
                    <th className="table-header mobile-hide">Fuel Type</th>
                    <th className="table-header">Opening (L)</th>
                    <th className="table-header">Closing (L)</th>
                    <th className="table-header">Sold (L)</th>
                    <th className="table-header mobile-hide">Price/L</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {readings.map(reading => {
                    const sold = Number(reading.openingLitres) - Number(reading.closingLitres); // opening - closing = sold
                    return (
                      <tr key={reading.id} className="table-row">
                        <td className="table-cell font-medium">{reading.pump?.name || 'Unknown Pump'}</td>
                        <td className="table-cell mobile-hide">
                          <span className="badge badge-blue">{reading.pump?.fuelType?.name || 'Unknown Fuel'}</span>
                        </td>
                        <td className="table-cell">{Number(reading.openingLitres).toFixed(2)}</td>
                        <td className="table-cell">{Number(reading.closingLitres).toFixed(2)}</td>
                        <td className="table-cell font-semibold">{sold.toFixed(2)}</td>
                        <td className="table-cell mobile-hide">₹{Number(reading.pricePerLitre).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Client Credits */}
          <div className="table-container">
            <div className="table-header">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Client Credits - {new Date(date).toLocaleDateString()}</h2>
                <div className="text-sm text-slate-500">
                  {credits.length} credit{credits.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="table-header">Client</th>
                    <th className="table-header">Fuel Type</th>
                    <th className="table-header">Litres</th>
                    <th className="table-header">Price/L</th>
                    <th className="table-header">Total Amount</th>
                    <th className="table-header">Time</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {credits.map(credit => (
                    <tr key={credit.id} className="table-row">
                      <td className="table-cell font-medium">{credit.client?.name || 'Unknown Client'}</td>
                      <td className="table-cell">
                        <span className="badge badge-slate">{credit.fuelType?.name || 'Unknown Fuel'}</span>
                      </td>
                      <td className="table-cell">{Number(credit.litres).toFixed(2)}L</td>
                      <td className="table-cell">₹{Number(credit.pricePerLitre).toFixed(2)}</td>
                      <td className="table-cell font-semibold text-slate-900">₹{currency(Number(credit.totalAmount))}</td>
                      <td className="table-cell text-slate-500">{new Date(credit.date).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-4">
      <div className="text-xs text-gray-600">{title}</div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  );
}

function today() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function currency(n: number | undefined) {
  if (n === undefined || n === null || isNaN(n)) return '0.00';
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}


