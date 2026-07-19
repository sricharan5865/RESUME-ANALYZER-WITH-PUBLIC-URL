import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Users } from 'lucide-react';

const money = (n) => (n == null ? "—" : n.toLocaleString(undefined, { maximumFractionDigits: 0 }));

export default function Placements({ backendUrl, token }) {
  const [rows, setRows] = useState([]);
  const [a, setA] = useState(null);

  useEffect(() => {
    fetch(`${backendUrl}/api/placements`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(setRows)
      .catch(console.error);

    fetch(`${backendUrl}/api/placements/analytics`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(setA)
      .catch(console.error);
  }, [backendUrl, token]);

  const monthMax = Math.max(1, ...(a?.byMonth?.map((m) => m.count) ?? [1]));

  return (
    <div style={{ padding: '24px' }}>


      <div className="kpi-grid">
        <div className="kpi-card"><div className="kpi-value">{a?.totalPlacements ?? 0}</div><div className="kpi-label">Total Placements</div></div>
        <div className="kpi-card"><div className="kpi-value">{a?.placementsThisMonth ?? 0}</div><div className="kpi-label">This Month</div></div>
        <div className="kpi-card"><div className="kpi-value">${money(a?.avgSalaryIncrease ?? 0)}</div><div className="kpi-label">Avg Salary Increase</div></div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <h3 style={{ marginBottom: '16px' }}>Placements by Month</h3>
          <div className="bars">
            {(a?.byMonth ?? []).map((m) => (
              <div key={m.month} className="bar-row">
                <span className="bar-label">{m.month}</span>
                <div className="bar-track"><div className="bar-fill" style={{ width: `${(m.count / monthMax) * 100}%` }} /></div>
                <span className="bar-count">{m.count}</span>
              </div>
            ))}
            {(a?.byMonth?.length ?? 0) === 0 && <p className="muted empty">No placements yet.</p>}
          </div>
        </div>

        <div className="panel">
          <h3 style={{ marginBottom: '16px' }}>By Source Channel</h3>
          <table className="mini-table">
            <thead><tr><th>Channel</th><th className="num">Placements</th><th className="num">Avg Increase</th></tr></thead>
            <tbody>
              {(a?.byChannel ?? []).map((c) => (
                <tr key={c.channel}>
                  <td style={{ textTransform: 'capitalize' }}>{c.channel}</td>
                  <td className="num">{c.count}</td>
                  <td className="num">${money(c.avgIncrease)}</td>
                </tr>
              ))}
              {(a?.byChannel?.length ?? 0) === 0 && <tr><td colSpan={3} className="muted empty">No data.</td></tr>}
            </tbody>
          </table>
          <h3 style={{ marginTop: '24px', marginBottom: '16px' }}>By Department</h3>
          <table className="mini-table">
            <tbody>
              {(a?.byDepartment ?? []).map((d) => (
                <tr key={d.department}><td>{d.department}</td><td className="num strong">{d.count}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--glass-border)' }}>
          <h3 style={{ margin: 0 }}>Placed Candidates</h3>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Candidate</th><th>Role</th><th>Department</th>
              <th className="num">Previous</th><th className="num">New</th><th className="num">Increase</th>
              <th>Channel</th><th>Placed On</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <div className="strong">{r.name}</div>
                  <div className="muted small">{r.trackingId}</div>
                </td>
                <td>{r.rolePlaced ?? "—"}</td>
                <td>{r.department ?? "—"}</td>
                <td className="num">${money(r.previousSalary)}</td>
                <td className="num">${money(r.newSalary)}</td>
                <td className="num strong" style={{ color: r.increase > 0 ? "var(--status-offered)" : undefined }}>
                  {r.increase > 0 ? `+$${money(r.increase)}` : `$${money(r.increase)}`}
                </td>
                <td style={{ textTransform: 'capitalize' }}>{r.sourceChannel ?? "—"}</td>
                <td>{new Date(r.placementDate).toLocaleDateString()}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={8} className="empty">No placements recorded yet. Mark a candidate as placed from their profile.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
