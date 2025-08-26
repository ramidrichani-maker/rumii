import React from 'react';
import { Slider } from '@/components/ui/slider';

interface RangeSliderProps {
  value: [number, number];
  onValueChange: (value: [number, number]) => void;
  min: number;
  max: number;
  step: number;
  label: string;
  unit?: string;
  maxLabel?: string;
}

const RangeSlider: React.FC<RangeSliderProps> = ({
  value,
  onValueChange,
  min,
  max,
  step,
  label,
  unit = '',
  maxLabel
}) => {
  const formatValue = (val: number) => {
    if (val >= max && maxLabel) {
      return maxLabel;
    }
    return `${val}${unit}`;
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4 text-foreground">
        {label}: {formatValue(value[0])} - {formatValue(value[1])}
      </h3>
      <div className="px-4 space-y-4">
        <Slider
          value={value}
          onValueChange={onValueChange}
          max={max}
          min={min}
          step={step}
          className="w-full"
        />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{min}{unit}</span>
          <span>{maxLabel || `${max}${unit}`}</span>
        </div>
      </div>
    </div>
  );
};

export default RangeSlider;