import React from 'react';

interface PremiumTableProps {
  headers: string[];
  data: any[][];
  className?: string;
}

export default function PremiumTable({
  headers,
  data,
  className = ''
}: PremiumTableProps) {
  return (
    <div className={`premium-table-container ${className}`}>
      <table className="premium-table">
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th key={index}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr key={rowIndex} className="premium-table-row">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="premium-table-cell">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
