import { Chart } from 'chart.js/auto'

let chartInstance = null

export function initChart(canvasId) {
  const el = document.getElementById(canvasId)
  if (!el) return

  if (chartInstance) chartInstance.destroy()

  chartInstance = new Chart(el, {
    type: 'bar',
    data: {
      labels: ['Urban Core', 'Commercial', 'Residential', 'Parks'],
      datasets: [
        {
          label: 'Before (°C)',
          data: [43, 41, 39.5, 36],
          backgroundColor: 'rgba(249,115,22,0.75)',
          borderColor: 'rgba(249,115,22,1)',
          borderWidth: 1,
          borderRadius: 5,
        },
        {
          label: 'After (°C)',
          data: [43, 41, 39.5, 36],
          backgroundColor: 'rgba(56,189,248,0.7)',
          borderColor: 'rgba(56,189,248,1)',
          borderWidth: 1,
          borderRadius: 5,
        },
      ],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 500, easing: 'easeOutCubic' },
      plugins: {
        legend: {
          labels: {
            color: '#CBD5E1',
            font: { family: 'Inter', size: 11 },
            boxWidth: 12,
            padding: 16,
          },
        },
        tooltip: {
          backgroundColor: 'rgba(2,6,23,0.95)',
          titleColor: '#F8FAFC',
          bodyColor: '#CBD5E1',
          borderColor: 'rgba(255,255,255,0.08)',
          borderWidth: 1,
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${ctx.raw}°C`,
          },
        },
      },
      scales: {
        x: {
          ticks: { color: '#64748B', font: { family: 'Inter', size: 10 } },
          grid: { color: 'rgba(255,255,255,0.04)' },
          title: { display: true, text: 'Temperature (°C)', color: '#64748B', font: { size: 10 } },
        },
        y: {
          ticks: { color: '#CBD5E1', font: { family: 'Inter', size: 10 } },
          grid: { color: 'rgba(255,255,255,0.04)' },
        },
      },
    },
  })

  return chartInstance
}

export function updateChart(beforeData, afterData) {
  if (!chartInstance) return
  chartInstance.data.datasets[0].data = beforeData
  chartInstance.data.datasets[1].data = afterData
  chartInstance.update()
}
