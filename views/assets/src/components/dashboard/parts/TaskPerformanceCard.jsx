import { __ } from '@wordpress/i18n'
import { Bar, BarChart, XAxis, CartesianGrid } from 'recharts'
import { BarChart3 } from 'lucide-react'
import { Card } from '@components/ui/card'
import { cn } from '@lib/utils'
import { CardHead, EmptyState } from './CardShell'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@components/ui/chart'

export default function TaskPerformanceCard({ performance, range = 7, onRangeChange, loading = false }) {
  const data = performance || []
  const ranges = [
    { v: 7, label: __('7d', 'wedevs-project-manager') },
    { v: 30, label: __('30d', 'wedevs-project-manager') },
  ]

  const isEmpty = data.every(d => !d.created && !d.completed)

  const chartConfig = {
    completed: { label: __('Completed', 'wedevs-project-manager'), color: 'hsl(var(--primary))' },
    created:   { label: __('Created', 'wedevs-project-manager'),   color: 'hsl(152 60% 52%)' },
  }

  return (
    <Card className="rounded-xl p-5 border-pm-border flex flex-col">
      <CardHead
        title={__('Task Performance', 'wedevs-project-manager')}
        subtitle={__('Created vs completed', 'wedevs-project-manager')}
        action={onRangeChange && (
          <div className="flex items-center gap-0.5 rounded-lg bg-pm-surface-muted p-0.5 shrink-0">
            {ranges.map(r => (
              <button
                key={r.v}
                onClick={() => onRangeChange(r.v)}
                disabled={loading}
                className={cn(
                  'px-2.5 py-1 rounded-md text-[12px] font-medium transition-colors',
                  range === r.v ? 'bg-card text-pm-text-primary shadow-sm' : 'text-pm-text-muted hover:text-pm-text-primary',
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}
      />

      {isEmpty ? (
        <div className="h-[220px] flex">
          <EmptyState icon={BarChart3}>
            {__('No tasks created or completed in this period.', 'wedevs-project-manager')}
          </EmptyState>
        </div>
      ) : (
      <ChartContainer config={chartConfig} className="h-[220px] w-full mt-2">
        <BarChart data={data} barGap={4}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar dataKey="completed" fill="var(--color-completed)" radius={[4, 4, 0, 0]} maxBarSize={26} />
          <Bar dataKey="created" fill="var(--color-created)" radius={[4, 4, 0, 0]} maxBarSize={26} />
        </BarChart>
      </ChartContainer>
      )}
    </Card>
  )
}
