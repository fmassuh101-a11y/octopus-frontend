'use client'

import { TimePeriodValue, TIME_PERIODS } from '@/lib/types/analytics'

interface TimePeriodFilterProps {
  selected: TimePeriodValue
  onChange: (period: TimePeriodValue) => void
  disabled?: boolean
}

export function TimePeriodFilter({ selected, onChange, disabled }: TimePeriodFilterProps) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-2 -mb-2">
      {TIME_PERIODS.map((period) => (
        <button
          key={period.value}
          onClick={() => onChange(period.value)}
          disabled={disabled}
          className={`
            px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all
            ${selected === period.value
              ? 'bg-black text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          {period.shortLabel}
        </button>
      ))}
    </div>
  )
}
