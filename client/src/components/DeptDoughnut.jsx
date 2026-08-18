import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";
import "./DeptDoughnut.css";

const PALETTE = [
  "#0ea5e9", // sky
  "#f97316", // flame
  "#10b981", // emerald
  "#8b5cf6", // violet
  "#ef4444", // coral red
  "#eab308", // amber
  "#06b6d4", // cyan
  "#ec4899", // pink
];

const toRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return {
    r: (n >> 16) & 0xff,
    g: (n >> 8) & 0xff,
    b: n & 0xff,
  };
};

const mix = (hex, otherHex, amount) => {
  const a = toRgb(hex);
  const b = toRgb(otherHex);
  const c = {
    r: Math.round(a.r + (b.r - a.r) * amount),
    g: Math.round(a.g + (b.g - a.g) * amount),
    b: Math.round(a.b + (b.b - a.b) * amount),
  };
  return `rgb(${c.r}, ${c.g}, ${c.b})`;
};

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
            backgroundColor: (context) => {
              const { ctx: c, chartArea } = context.chart;
              if (!chartArea) return PALETTE[context.dataIndex % PALETTE.length];
              const { top, bottom } = chartArea;
              const base = PALETTE[context.dataIndex % PALETTE.length];
              const gradient = c.createLinearGradient(0, top, 0, bottom);
              gradient.addColorStop(0, mix(base, "#ffffff", 0.28));
              gradient.addColorStop(1, mix(base, "#0b1020", 0.22));
              return gradient;
            },
            hoverBackgroundColor: (context) =>
              mix(PALETTE[context.dataIndex % PALETTE.length], "#ffffff", 0.32),
            borderColor: "#ffffff",
            borderWidth: 3,
            borderRadius: 8,
            hoverOffset: 12,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "70%",
        animation: {
          animateRotate: true,
          animateScale: true,
          duration: 900,
          easing: "easeOutQuart",
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "rgba(10, 14, 24, 0.92)",
            titleColor: "rgba(255, 255, 255, 0.7)",
            bodyColor: "#ffffff",
            padding: 12,
            cornerRadius: 10,
            displayColors: true,
            boxPadding: 4,
            callbacks: {
              label: (item) => {
                const count = Number(item.parsed);
                const pct = total ? ((count / total) * 100).toFixed(1) : "0";
                return ` ${item.label}: ${count} (${pct}%)`;
              },
            },
          },
        },
      },
    });
    return () => {
      chart.destroy();
    };
  }, [depts, total]);

  if (!depts.length) return null;

  return (
    <div className="dept-chart">
      <div className="dept-chart-canvas">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Applications by department"
        />
        <div className="dept-chart-center" aria-hidden="true">
          <strong>{total}</strong>
          <span>Applications</span>
        </div>
      </div>
      <ul className="dept-legend">
        {depts.map((d, i) => {
          const pct = total ? ((Number(d.count) / total) * 100).toFixed(0) : "0";
          return (
            <li key={d.department}>
              <span
                className="dept-dot"
                style={{ background: PALETTE[i % PALETTE.length] }}
              />
              <span className="dept-name">{d.department}</span>
              <span className="dept-count">
                {d.count}
                <em>{pct}%</em>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default DeptDoughnut;