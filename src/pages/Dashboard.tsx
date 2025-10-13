import { useEffect, useState } from 'react';
import { apiClient } from '../utils/api';

type DashboardData = {
  todaySales: number;
  todayProfit: number;
  totalClients: number;
  totalCredits: number;
  unpaidCredits: number;
  tankLevels: Array<{
    id: number;
    name: string;
    fuelType: string;
    currentLevel: number;
    capacity: number;
    percentage: number;
  }>;
  recentSales: Array<{
    id: number;
    client: string;
    amount: number;
    date: string;
  }>;
  lowStockTanks: Array<{
    id: number;
    name: string;
    fuelType: string;
    currentLevel: number;
    capacity: number;
    percentage: number;
  }>;
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('today');

  useEffect(() => {
    loadDashboardData();
  }, [dateRange]);

  async function loadDashboardData() {
    try {
      setLoading(true);
      const [salesResponse, clientsResponse, creditsResponse, tanksResponse] = await Promise.all([
        apiClient.get(`/api/reports/summary?period=${dateRange}`),
        apiClient.get('/api/clients'),
        apiClient.get('/api/credits'),
        apiClient.get('/api/tanks')
      ]);

      const sales = salesResponse.data;
      const clients = clientsResponse.data;
      const credits = creditsResponse.data;
      const tanks = tanksResponse.data;

      // Calculate metrics
      const todaySales = sales.totalSales || 0;
      const todayProfit = sales.totalProfit || 0;
      const totalClients = clients.length;
      const totalCredits = credits.length;
      const unpaidCredits = credits.filter((c: any) => c.status === 'unpaid').length;

      // Process tank levels
      const tankLevels = tanks.map((tank: any) => {
        const currentLevel = Number(tank.currentLevel) || 0;
        const capacity = Number(tank.capacity) || 1; // Avoid division by zero
        
        // Cap percentage at 100% to prevent unrealistic values
        let percentage = capacity > 0 ? (currentLevel / capacity) * 100 : 0;
        percentage = Math.min(percentage, 100); // Cap at 100%
        
        return {
          id: tank.id,
          name: tank.name,
          fuelType: tank.fuelType.name,
          currentLevel,
          capacity,
          percentage: Math.round(percentage * 10) / 10 // Round to 1 decimal place
        };
      });


      // Find low stock tanks
      const lowStockTanks = tankLevels.filter(tank => tank.percentage < 20);

      setData({
        todaySales,
        todayProfit,
        totalClients,
        totalCredits,
        unpaidCredits,
        tankLevels,
        recentSales: [],
        lowStockTanks
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  function currency(amount: number) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="premium-loading"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <div className="premium-card">
          <div className="premium-card-body text-center">
            <h2 className="premium-heading-3 text-slate-900 mb-2">Unable to load dashboard data</h2>
            <p className="premium-text-large text-slate-600 mb-6">Please check your connection and try again.</p>
            <button className="btn-premium btn-premium-primary" onClick={loadDashboardData}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Premium Header */}
      <div className="premium-card">
        <div className="premium-card-header">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="premium-heading-1 premium-gradient-text text-2xl sm:text-3xl">Executive Dashboard</h1>
              <p className="premium-text-large text-slate-600 mt-2 text-sm sm:text-base">
                Comprehensive business analytics and real-time insights
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="premium-text-small text-slate-600">Period:</span>
                <select 
                  value={dateRange} 
                  onChange={(e) => setDateRange(e.target.value as any)}
                  className="premium-select w-32"
                >
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                </select>
              </div>
              <div className="premium-badge premium-badge-success">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Live Data
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="premium-metric">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-xl">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="premium-badge premium-badge-success">+12.5%</div>
          </div>
          <div className="premium-metric-value text-green-600">{currency(data.todaySales)}</div>
          <div className="premium-metric-label">Total Revenue</div>
        </div>

        <div className="premium-metric">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4" />
              </svg>
            </div>
            <div className="premium-badge premium-badge-primary">+8.2%</div>
          </div>
          <div className="premium-metric-value text-blue-600">{currency(data.todayProfit)}</div>
          <div className="premium-metric-label">Net Profit</div>
        </div>

        <div className="premium-metric">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 rounded-xl">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="premium-badge premium-badge-primary">{data.totalClients}</div>
          </div>
          <div className="premium-metric-value text-purple-600">{data.totalClients}</div>
          <div className="premium-metric-label">Active Clients</div>
        </div>

        <div className="premium-metric">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-amber-100 rounded-xl">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="premium-badge premium-badge-warning">{data.unpaidCredits}</div>
          </div>
          <div className="premium-metric-value text-amber-600">{data.unpaidCredits}</div>
          <div className="premium-metric-label">Pending Credits</div>
        </div>
      </div>


      {/* Low Stock Alert */}
      {data.lowStockTanks.length > 0 && (
        <div className="premium-card border-l-4 border-red-500">
          <div className="premium-card-header bg-red-50">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="premium-heading-3 text-red-900">Low Stock Alert</h3>
                <p className="premium-text-small text-red-700">Immediate attention required</p>
              </div>
            </div>
          </div>
          <div className="premium-card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.lowStockTanks.map((tank) => (
                <div key={tank.id} className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-200">
                  <div>
                    <div className="font-medium text-red-900">{tank.name}</div>
                    <div className="text-sm text-red-700">{tank.fuelType}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-red-600">{tank.percentage.toFixed(1)}%</div>
                    <div className="text-sm text-red-600">Critical Level</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}