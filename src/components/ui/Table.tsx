import React from 'react';

interface TableProps {
  headers: string[];
  children: React.ReactNode;
}

export const Table: React.FC<TableProps> = ({ headers, children }) => {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left text-sm text-dark">
        <thead className="bg-slate-50/75 border-b border-dark-border text-xs uppercase font-medium text-dark-secondary">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-3">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-dark-border/60">
          {children}
        </tbody>
      </table>
    </div>
  );
};