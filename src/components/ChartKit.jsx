import { useMemo } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts'

/**
 * Apple-Watch-style chart kit.
 * - Soft gradient fills fading to transparent
 * - Thick rounded geometry
 * - No gridlines / no axis chrome
 * - Smooth bezier lines (monotone)
 * - Premium dark-friendly tooltip
 */

const blend = (hex, amount = 0) => {
  if (!hex || !hex.startsWith('#')) return hex
  const n = parseInt(hex.slice(1), 16)
  const r = Math.max(0, Math.min(255, ((n >> 16) & 0xff) + amount))
  const g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + amount))
  const b = Math.max(0, Math.min(255, (n & 0xff) + amount))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

export function ChartGradient({ id, color, opacityTop = 0.9, opacityBottom = 0.05 }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={color} stopOpacity={opacityTop} />
      <stop offset="100%" stopColor={color} stopOpacity={opacityBottom} />
    </linearGradient>
  )
}

export function PremiumTooltip({ active, payload, label, formatter, labelFormatter }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-2xl border border-outline-variant bg-surface/95 px-3 py-2 text-xs shadow-xl backdrop-blur-md">
      {label !== undefined && (
        <p className="mb-1 font-medium text-on-surface-variant">{labelFormatter ? labelFormatter(label, payload) : label}</p>
      )}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill || entry.stroke }} />
          <span className="text-on-surface-variant">{entry.name}</span>
          <span className="ml-auto font-semibold text-on-surface">
            {formatter ? formatter(entry.value, entry) : entry.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export function AppleAreaChart({ data, dataKey, color = 'var(--md-sys-color-primary)', height = 180, xKey = 'label', formatValue, formatLabel, onPointClick }) {
  const gradId = useMemo(() => `area-grad-${Math.random().toString(36).slice(2, 9)}`, [])
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 4 }}>
        <defs>
          <ChartGradient id={gradId} color={color} opacityTop={0.45} opacityBottom={0.02} />
        </defs>
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 10, fill: 'var(--md-sys-color-on-surface-variant)' }}
          axisLine={false}
          tickLine={false}
          dy={6}
          interval="preserveStartEnd"
          minTickGap={12}
        />
        <YAxis hide domain={['auto', 'auto']} />
        <Tooltip
          cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '4 4', opacity: 0.4 }}
          content={<PremiumTooltip formatter={formatValue} labelFormatter={formatLabel} />}
        />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill={`url(#${gradId})`}
          animationDuration={900}
          dot={false}
          activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--md-sys-color-surface)', fill: color }}
          onClick={onPointClick ? (payload) => onPointClick(payload) : undefined}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function AppleLineChart({ data, series = [], height = 180, xKey = 'month', formatValue, formatLabel }) {
  // series: [{ key, name, color }]
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 14, left: -28, bottom: 0 }}>
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 10, fill: 'var(--md-sys-color-on-surface-variant)' }}
          axisLine={false}
          tickLine={false}
          dy={6}
        />
        <YAxis
          tick={{ fontSize: 10, fill: 'var(--md-sys-color-on-surface-variant)' }}
          axisLine={false}
          tickLine={false}
          width={40}
          tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
        />
        <Tooltip content={<PremiumTooltip formatter={formatValue} labelFormatter={formatLabel} />} cursor={false} />
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--md-sys-color-surface)' }}
            animationDuration={900}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

export function AppleBarChart({
  data,
  dataKey,
  color = 'var(--md-sys-color-primary)',
  height = 180,
  xKey = 'label',
  radius = 8,
  formatValue,
  formatLabel,
  onBarClick
}) {
  const gradId = useMemo(() => `bar-grad-${Math.random().toString(36).slice(2, 9)}`, [])
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <ChartGradient id={gradId} color={color} opacityTop={1} opacityBottom={0.5} />
        </defs>
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 10, fill: 'var(--md-sys-color-on-surface-variant)' }}
          axisLine={false}
          tickLine={false}
          dy={6}
          interval="preserveStartEnd"
        />
        <YAxis hide domain={[0, 'auto']} />
        <Tooltip
          cursor={{ fill: color, fillOpacity: 0.08, radius: 10 }}
          content={<PremiumTooltip formatter={formatValue} labelFormatter={formatLabel} />}
        />
        <Bar
          dataKey={dataKey}
          fill={`url(#${gradId})`}
          radius={[radius, radius, radius, radius]}
          maxBarSize={36}
          animationDuration={900}
          onClick={onBarClick ? (data) => onBarClick(data) : undefined}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function AppleMultiBarChart({
  data,
  series = [], // [{ key, name, color }]
  height = 180,
  xKey = 'label',
  radius = 8,
  formatValue,
  formatLabel
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -28, bottom: 0 }} barGap={2} barCategoryGap={3}>
        <defs>
          {series.map((_, i) => (
            <ChartGradient
              key={i}
              id={`mbar-grad-${i}`}
              color={series[i].color}
              opacityTop={1}
              opacityBottom={0.55}
            />
          ))}
        </defs>
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 10, fill: 'var(--md-sys-color-on-surface-variant)' }}
          axisLine={false}
          tickLine={false}
          dy={6}
        />
        <YAxis
          tick={{ fontSize: 10, fill: 'var(--md-sys-color-on-surface-variant)' }}
          axisLine={false}
          tickLine={false}
          width={40}
          tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
        />
        <Tooltip content={<PremiumTooltip formatter={formatValue} labelFormatter={formatLabel} />} cursor={{ fill: 'var(--md-sys-color-surface-variant)', fillOpacity: 0.2, radius: 10 }} />
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.name}
            fill={s.color}
            radius={[radius, radius, radius, radius]}
            maxBarSize={18}
            animationDuration={900}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

export function AppleDonutChart({
  data, // [{ name, value, color }]
  height = 180,
  innerRadius = 55,
  outerRadius = 80,
  paddingAngle = 3,
  formatValue,
  formatLabel,
  onClick
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <defs>
          {data.map((entry, i) => (
            <ChartGradient
              key={i}
              id={`donut-grad-${i}`}
              color={entry.color}
              opacityTop={1}
              opacityBottom={0.65}
            />
          ))}
        </defs>
        <Tooltip content={<PremiumTooltip formatter={formatValue} labelFormatter={formatLabel} />} />
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={paddingAngle}
          stroke="var(--md-sys-color-surface)"
          strokeWidth={2}
          cornerRadius={8}
          startAngle={90}
          endAngle={-270}
          animationDuration={900}
          onClick={onClick}
          cursor={onClick ? 'pointer' : 'default'}
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={`url(#donut-grad-${i})`} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  )
}

export { blend }