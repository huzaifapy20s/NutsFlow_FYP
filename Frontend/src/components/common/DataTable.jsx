export default function DataTable({ columns, rows, emptyText = "No data found." }) {
  const safeRows = Array.isArray(rows) ? rows : [];
  if (!safeRows.length) {
    return <div className="card text-sm text-slate-500">{emptyText}</div>;
  }

  return (
    <div className="card overflow-x-auto p-0">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-4 py-3 font-semibold">
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {safeRows.map((row, index) => (
            <tr key={row.id || index} className="border-b border-slate-100 last:border-b-0">
              {columns.map((column) => (
                <td key={column.key} className="px-4 py-3">
                  {column.render ? column.render(row, index) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}