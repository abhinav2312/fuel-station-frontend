import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';
import LogViewer from '../components/LogViewer';
import API_BASE_URL from '../utils/api';

type Tank = {
  id: number;
  name: string;
  capacityLit: number;
  currentLevel: number;
  fuelType: {
    name: string;
    price: number;
  };
};

export default function Settings() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [showLogViewer, setShowLogViewer] = useState(false);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [tankUpdates, setTankUpdates] = useState<Record<number, { level: string; capacity: string }>>({});

  // Load tanks on component mount
  useEffect(() => {
    loadTanks();
  }, []);

  // Message handling with auto-hide
  function showMessage(text: string, type: 'success' | 'error') {
    setMessage(text);
    setMessageType(type);
    if (type === 'success') {
      setTimeout(() => setMessage(''), 2000);
    }
  }

  async function loadTanks() {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/tanks`);
      setTanks(response.data);
    } catch (error) {
      console.error('Error loading tanks:', error);
    }
  }

  function updateTankField(tankId: number, field: 'level' | 'capacity', value: string) {
    setTankUpdates(prev => ({
      ...prev,
      [tankId]: {
        ...prev[tankId],
        [field]: value
      }
    }));
  }

  async function updateTank(tankId: number) {
    const updates = tankUpdates[tankId];
    if (!updates) return;

    try {
      setLoading(true);
      const updateData: any = {};
      
      // Only include fields that have actual values (not empty strings)
      if (updates.level && updates.level.trim() !== '') {
        const level = parseFloat(updates.level);
        if (!isNaN(level) && level >= 0) {
          updateData.currentLevel = level;
        }
      }
      
      if (updates.capacity && updates.capacity.trim() !== '') {
        const capacity = parseFloat(updates.capacity);
        if (!isNaN(capacity) && capacity > 0) {
          updateData.capacityLit = capacity;
        }
      }

      if (Object.keys(updateData).length === 0) {
        showMessage('No valid changes to update', 'error');
        return;
      }

      const response = await axios.put(`${API_BASE_URL}/api/tanks/${tankId}`, updateData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      showMessage('Tank updated successfully!', 'success');
      
      // Clear the updates for this tank
      setTankUpdates(prev => {
        const newUpdates = { ...prev };
        delete newUpdates[tankId];
        return newUpdates;
      });
      
      // Reload tanks
      await loadTanks();
    } catch (error: any) {
      console.error('Error updating tank:', error);
      console.error('Error response:', error.response?.data);
      showMessage(`Failed to update tank: ${error.response?.data?.message || error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function exportData() {
    try {
      setLoading(true);
      setMessage('Preparing data export...');
      
      // Fetch all data
      const [sales, clients, purchases, credits, tanks, prices] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/sales`),
        axios.get(`${API_BASE_URL}/api/clients`),
        axios.get(`${API_BASE_URL}/api/purchases`),
        axios.get(`${API_BASE_URL}/api/credits`),
        axios.get(`${API_BASE_URL}/api/tanks`),
        axios.get(`${API_BASE_URL}/api/prices`)
      ]);

      const exportData = {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        data: {
          sales: sales.data,
          clients: clients.data,
          purchases: purchases.data,
          credits: credits.data,
          tanks: tanks.data,
          prices: prices.data
        }
      };

      // Create and download file
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `fuel-station-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showMessage('Data exported successfully!', 'success');
    } catch (error) {
      console.error('Export error:', error);
      showMessage('Failed to export data', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function exportCSV() {
    try {
      setLoading(true);
      setMessage('Preparing CSV export...');
      
      const [sales, clients, purchases, credits] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/sales`),
        axios.get(`${API_BASE_URL}/api/clients`),
        axios.get(`${API_BASE_URL}/api/purchases`),
        axios.get(`${API_BASE_URL}/api/credits`)
      ]);

      // Convert to CSV format
      const salesCSV = convertToCSV(sales.data, 'sales');
      const clientsCSV = convertToCSV(clients.data, 'clients');
      const purchasesCSV = convertToCSV(purchases.data, 'purchases');
      const creditsCSV = convertToCSV(credits.data, 'credits');

      // Download CSV files
      downloadCSV(salesCSV, 'sales.csv');
      downloadCSV(clientsCSV, 'clients.csv');
      downloadCSV(purchasesCSV, 'purchases.csv');
      downloadCSV(creditsCSV, 'credits.csv');

      showMessage('CSV files exported successfully!', 'success');
    } catch (error) {
      console.error('CSV export error:', error);
      showMessage('Failed to export CSV files', 'error');
    } finally {
      setLoading(false);
    }
  }

  function convertToCSV(data: any[], type: string): string {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');
    
    return csvContent;
  }

  function downloadCSV(csvContent: string, filename: string) {
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-8">
      {/* Toast Notification */}
      {message && (
        <div className={`fixed top-4 right-4 z-50 max-w-sm w-full bg-white rounded-lg shadow-lg border-l-4 ${
          messageType === 'success' ? 'border-green-500' : 'border-red-500'
        }`}>
          <div className="p-4">
            <div className="flex items-start">
              <div className={`flex-shrink-0 ${messageType === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                {messageType === 'success' ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="ml-3 w-0 flex-1">
                <p className={`text-sm font-medium ${
                  messageType === 'success' ? 'text-green-800' : 'text-red-800'
                }`}>
                  {message}
                </p>
              </div>
              <div className="ml-4 flex-shrink-0 flex">
                <button
                  className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  onClick={() => setMessage('')}
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Premium Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-2">System Settings</h1>
            <p className="text-slate-300 text-sm sm:text-base">Manage your fuel station data and system configuration</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">System Online</span>
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100">
          <div className="h-2 w-full bg-gradient-to-r from-blue-500 to-blue-600"></div>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900">Data Export</h3>
            </div>
            <p className="text-gray-600 mb-6 text-sm">
              Export all your fuel station data as JSON backup files. This includes sales, clients, purchases, and all other data.
            </p>
            <Button 
              onClick={exportData} 
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 rounded-xl transition-all duration-200"
            >
              {loading ? 'Exporting...' : 'Export JSON Backup'}
            </Button>
          </div>
        </div>

        <div className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100">
          <div className="h-2 w-full bg-gradient-to-r from-green-500 to-green-600"></div>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900">CSV Export</h3>
            </div>
            <p className="text-gray-600 mb-6 text-sm">
              Export data in CSV format for analysis in Excel or other spreadsheet applications.
            </p>
            <Button 
              onClick={exportCSV} 
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-3 rounded-xl transition-all duration-200"
            >
              {loading ? 'Exporting...' : 'Export CSV Files'}
            </Button>
          </div>
        </div>
      </div>

      {/* System Information */}
      <div className="bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 rounded-2xl p-6 sm:p-8 border border-indigo-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">System Information</h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 110 2h-1v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6H3a1 1 0 110-2h4zM9 6h6v10H9V6z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-600">Application</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">v2.0.0</div>
            <div className="text-xs text-gray-500">Latest Version</div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-600">Database</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">SQLite</div>
            <div className="text-xs text-gray-500">Local Storage</div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-600">Status</span>
            </div>
            <div className="text-2xl font-bold text-green-600 mb-1">Online</div>
            <div className="text-xs text-gray-500">System Operational</div>
          </div>
        </div>
      </div>

      {/* Tank Management */}
      <div className="bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 rounded-2xl p-6 sm:p-8 border border-orange-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">Tank Management</h3>
        </div>
        
        <div className="space-y-4">
          {tanks.map((tank) => (
            <div key={tank.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">{tank.name}</h4>
                  <p className="text-sm text-gray-600">{tank.fuelType.name}</p>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>Current: {tank.currentLevel.toLocaleString()}L</span>
                  <span>Capacity: {tank.capacityLit.toLocaleString()}L</span>
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {((tank.currentLevel / tank.capacityLit) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Update Current Level (Liters)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={tank.currentLevel.toString()}
                    value={tankUpdates[tank.id]?.level || ''}
                    onChange={(e) => updateTankField(tank.id, 'level', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Update Capacity (Liters)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={tank.capacityLit.toString()}
                    value={tankUpdates[tank.id]?.capacity || ''}
                    onChange={(e) => updateTankField(tank.id, 'capacity', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>
              
              <div className="mt-4 flex justify-end">
                <Button
                  onClick={() => updateTank(tank.id)}
                  disabled={loading || !tankUpdates[tank.id] || (!tankUpdates[tank.id]?.level && !tankUpdates[tank.id]?.capacity)}
                  className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-semibold px-6 py-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Updating...' : 'Update Tank'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System Logs */}
      <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 rounded-2xl p-6 sm:p-8 border border-purple-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">System Logs</h3>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <p className="text-gray-600 mb-6 text-sm">
            View real-time system logs for debugging and monitoring. Track API calls, errors, user actions, and performance metrics.
          </p>
          <Button 
            onClick={() => setShowLogViewer(true)}
            className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-3 rounded-xl transition-all duration-200"
          >
            Open Log Viewer
          </Button>
        </div>
      </div>


      {/* Log Viewer Modal */}
      <LogViewer 
        isOpen={showLogViewer} 
        onClose={() => setShowLogViewer(false)} 
      />
    </div>
  );
}
