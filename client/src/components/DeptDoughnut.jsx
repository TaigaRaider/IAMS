import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";
import "./DeptDoughnut.css";

const PALETTE = [
  "#083344",
  "#0c4a6e",
  "#0891b2",
  "#0369a1",
  "#0369a1",
  "#155e75",
  "#0284c7",
];

function DeptDoughnut({ depts }) {
  const canvasRef = useRef(null);
  const total = depts.reduce((sum, d) => sum + Number(d.count || 0), 0);

  useEffect(() => {
    if (!depts.length || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    const chart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: depts.map((d) => d.department),
        datasets: [
          {
            data: depts.map((d) => Number(d.count)),
            backgroundColor: depts.map((_, i) => PALETTE[i % PALETTE.length]),
            borderColor: "#fff",
            borderWidth: 3,
            hoverOffset: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "72%",
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (item) =>
                ` ${item.label}: ${item.formattedValue} application${item.parsed === 1 ? "" : "s"}`,
            },
          },
        },
      },
    });
    return () => {
      chart.destroy();
    };
  }, [depts]);

  if (!depts.length) return null;

  return (
    <div className="dept-chart">
      <div className="dept-chart-canvas">
        <canvas ref={canvasRef} role="img" aria-label="Applications by department" />
        <div className="dept-chart-center" aria-hidden="true">
          <strong>{total}</strong>
          <span>Applications</span>
        </div>
      </div>
      <ul className="dept-legend">
        {depts.map((d, i) => (
          <li key={d.department}>
            <span
              className="dept-dot"
              style={{ background: PALETTE[i % PALETTE.length] }}
            />
            <span className="dept-name">{d.department}</span>
            <span className="dept-count">{d.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default DeptDoughnut;