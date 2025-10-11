import React, { useState, useEffect } from 'react';
import { logger, LogEntry, LogLevel, LogCategory } from '../utils/logger';

interface LogViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LogViewer({ isOpen, onClose }: LogViewerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState({
    level: LogLevel.DEBUG,
    category: '' as LogCategory | '',
    page: '',
    search: ''
  });
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadLogs();
      if (autoRefresh) {
        const interval = setInterval(loadLogs, 1000);
        return () => clearInterval(interval);
      }
    }
  }, [isOpen, autoRefresh]);

  const loadLogs = () => {
    const filteredLogs = logger.getLogs({
      level: filter.level,
      category: filter.category || undefined,
      page: filter.page || undefined
    });
    
    let searchFilteredLogs = filteredLogs;
    if (filter.search) {
      searchFilteredLogs = filteredLogs.filter(log => 
        log.message.toLowerCase().includes(filter.search.toLowerCase()) ||
        log.page.toLowerCase().includes(filter.search.toLowerCase()) ||
        JSON.stringify(log.data || {}).toLowerCase().includes(filter.search.toLowerCase())
      );
    }
    
    setLogs(searchFilteredLogs);
  };

  const getLevelColor = (level: LogLevel): string => {
    switch (level) {
      case LogLevel.DEBUG: return 'text-gray-500';
      case LogLevel.INFO: return 'text-blue-600';
      case LogLevel.WARN: return 'text-yellow-600';
      case LogLevel.ERROR: return 'text-red-600';
      case LogLevel.CRITICAL: return 'text-red-800 font-bold';
      default: return 'text-gray-500';
    }
  };

  const getLevelIcon = (level: LogLevel): string => {
    switch (level) {
      case LogLevel.DEBUG: return '🔍';
      case LogLevel.INFO: return 'ℹ️';
      case LogLevel.WARN: return '⚠️';
      case LogLevel.ERROR: return '❌';
      case LogLevel.CRITICAL: return '🚨';
      default: return '📝';
    }
  };

  const exportLogs = (format: 'json' | 'csv') => {
    const data = logger.exportLogs(format);
    const blob = new Blob([data], { type: format === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `logs_${new Date().toISOString().split('T')[0]}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-bold">System Logs</h2>
            <div className="flex items-center space-x-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="mr-2"
                />
                Auto Refresh
              </label>
              <span className="text-sm text-gray-500">
                {logs.length} logs
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => exportLogs('json')}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
            >
              Export JSON
            </button>
            <button
              onClick={() => exportLogs('csv')}
              className="px-3 py-1 bg-green-500 text-white rounded text-sm"
            >
              Export CSV
            </button>
            <button
              onClick={() => logger.clearLogs()}
              className="px-3 py-1 bg-red-500 text-white rounded text-sm"
            >
              Clear Logs
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1 bg-gray-500 text-white rounded text-sm"
            >
              Close
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Filters */}
          <div className="w-64 border-r p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Log Level</label>
              <select
                value={filter.level}
                onChange={(e) => setFilter({ ...filter, level: Number(e.target.value) })}
                className="w-full p-2 border rounded"
              >
                <option value={LogLevel.DEBUG}>Debug</option>
                <option value={LogLevel.INFO}>Info</option>
                <option value={LogLevel.WARN}>Warn</option>
                <option value={LogLevel.ERROR}>Error</option>
                <option value={LogLevel.CRITICAL}>Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <select
                value={filter.category}
                onChange={(e) => setFilter({ ...filter, category: e.target.value as LogCategory | '' })}
                className="w-full p-2 border rounded"
              >
                <option value="">All Categories</option>
                {Object.values(LogCategory).map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Page</label>
              <input
                type="text"
                value={filter.page}
                onChange={(e) => setFilter({ ...filter, page: e.target.value })}
                placeholder="Filter by page"
                className="w-full p-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Search</label>
              <input
                type="text"
                value={filter.search}
                onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                placeholder="Search logs..."
                className="w-full p-2 border rounded"
              />
            </div>

            <button
              onClick={loadLogs}
              className="w-full px-3 py-2 bg-blue-500 text-white rounded"
            >
              Apply Filters
            </button>
          </div>

          {/* Logs List */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${
                    selectedLog?.id === log.id ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => setSelectedLog(log)}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{getLevelIcon(log.level)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className={`font-medium ${getLevelColor(log.level)}`}>
                          {LogLevel[log.level]}
                        </span>
                        <span className="text-sm text-gray-500">
                          [{LogCategory[log.category]}]
                        </span>
                        <span className="text-sm text-gray-500">
                          {log.page}
                        </span>
                      </div>
                      <div className="text-sm text-gray-700 truncate">
                        {log.message}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Log Details */}
            {selectedLog && (
              <div className="border-t p-4 bg-gray-50 max-h-64 overflow-y-auto">
                <h3 className="font-bold mb-2">Log Details</h3>
                <div className="space-y-2 text-sm">
                  <div><strong>ID:</strong> {selectedLog.id}</div>
                  <div><strong>Timestamp:</strong> {selectedLog.timestamp}</div>
                  <div><strong>Level:</strong> {LogLevel[selectedLog.level]}</div>
                  <div><strong>Category:</strong> {LogCategory[selectedLog.category]}</div>
                  <div><strong>Page:</strong> {selectedLog.page}</div>
                  <div><strong>Session:</strong> {selectedLog.sessionId}</div>
                  <div><strong>Message:</strong> {selectedLog.message}</div>
                  {selectedLog.data && (
                    <div>
                      <strong>Data:</strong>
                      <pre className="mt-1 p-2 bg-white border rounded text-xs overflow-x-auto">
                        {JSON.stringify(selectedLog.data, null, 2)}
                      </pre>
                    </div>
                  )}
                  {selectedLog.error && (
                    <div>
                      <strong>Error:</strong>
                      <pre className="mt-1 p-2 bg-white border rounded text-xs overflow-x-auto">
                        {JSON.stringify(selectedLog.error, null, 2)}
                      </pre>
                    </div>
                  )}
                  {selectedLog.apiCall && (
                    <div>
                      <strong>API Call:</strong>
                      <pre className="mt-1 p-2 bg-white border rounded text-xs overflow-x-auto">
                        {JSON.stringify(selectedLog.apiCall, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
