import { useEffect, useState } from 'react';
import { apiClient } from '../utils/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

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
  salesTrend: Array<{
    date: string;
    sales: number;
    profit: number;
  }>;
  fuelTypeSales: Array<{
    name: string;
    value: number;
    color: string;
  }>;
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'year'>('today');

  useEffect(() => {
    loadDashboardData();
  }, [dateRange]);

  async function loadDashboardData() {
    try {
      setLoading(true);
      const [salesResponse, clientsResponse, creditsResponse, tanksResponse, salesTrendResponse] = await Promise.all([
        apiClient.get(`/api/reports/summary?period=${dateRange}`),
        apiClient.get('/api/clients'),
        apiClient.get('/api/credits'),
        apiClient.get('/api/tanks'),
        apiClient.get(`/api/reports/trends?period=${dateRange}`) // New endpoint for trend data
      ]);

      const sales = salesResponse.data;
      const clients = clientsResponse.data;
      const credits = creditsResponse.data;
      const tanks = tanksResponse.data;
      const salesTrend = salesTrendResponse.data || [];

      // Calculate metrics
      const todaySales = sales.totals?.revenue || 0;
      const todayProfit = sales.totals?.profit || 0;
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

      // Use real fuel type sales data from the sales response
      const fuelTypeSales = sales.fuelTypes?.map((fuelType: any, index: number) => ({
        name: fuelType.name,
        value: fuelType.revenue || 0,
        color: ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444'][index % 5]
      })) || [];

      setData({
        todaySales,
        todayProfit,
        totalClients,
        totalCredits,
        unpaidCredits,
        tankLevels,
        recentSales: [],
        lowStockTanks,
        salesTrend,
        fuelTypeSales
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

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Sales Trend Chart */}
        <div className="premium-card">
          <div className="premium-card-header">
            <h3 className="premium-heading-3">Sales Trend ({dateRange === 'today' ? 'Today' : dateRange === 'week' ? '7 Days' : dateRange === 'month' ? '30 Days' : '12 Months'})</h3>
            <p className="premium-text-small text-slate-600">
              {dateRange === 'today' ? 'Hourly' : dateRange === 'week' ? 'Daily' : dateRange === 'month' ? 'Weekly' : 'Monthly'} revenue and profit trends
            </p>
          </div>
          <div className="premium-card-body">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.salesTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => {
                      if (dateRange === 'today') {
                        return value; // Show hour directly
                      } else if (dateRange === 'week') {
                        return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      } else if (dateRange === 'month') {
                        return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      } else {
                        return new Date(value).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                      }
                    }}
                  />
                  <YAxis tickFormatter={(value) => `₹${(value/1000).toFixed(0)}k`} />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      `₹${value.toLocaleString()}`, 
                      name === 'sales' ? 'Revenue' : 'Profit'
                    ]}
                    labelFormatter={(label) => {
                      if (dateRange === 'today') {
                        return `Hour: ${label}`;
                      } else if (dateRange === 'year') {
                        return new Date(label).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                      } else {
                        return new Date(label).toLocaleDateString();
                      }
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="sales" 
                    stroke="#3B82F6" 
                    strokeWidth={3}
                    dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                    name="Revenue"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="profit" 
                    stroke="#10B981" 
                    strokeWidth={3}
                    dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                    name="Profit"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Fuel Type Sales Distribution */}
        <div className="premium-card">
          <div className="premium-card-header">
            <h3 className="premium-heading-3">Sales by Fuel Type</h3>
            <p className="premium-text-small text-slate-600">Revenue distribution across fuel types</p>
          </div>
          <div className="premium-card-body">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.fuelTypeSales}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(props: any) => `${props.name} ${(props.percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {data.fuelTypeSales.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Tank Levels Chart */}
      <div className="premium-card mb-8">
        <div className="premium-card-header">
          <h3 className="premium-heading-3">Tank Levels Overview</h3>
          <p className="premium-text-small text-slate-600">Current stock levels across all tanks</p>
        </div>
        <div className="premium-card-body">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.tankLevels}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => `${value}%`} />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    `${value}%`, 
                    'Fill Level'
                  ]}
                  labelFormatter={(label, payload) => {
                    const data = payload?.[0]?.payload;
                    return `${data?.name} (${data?.fuelType})`;
                  }}
                />
                <Bar 
                  dataKey="percentage" 
                  fill="#8B5CF6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
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