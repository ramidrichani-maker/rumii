import React from 'react';
import { Slider } from '@/components/ui/slider';
import './RangeSlider.css';

interface RangeSliderProps {
  value: [number, number];
  onValueChange: (value: [number, number]) => void;
  min: number;
  max: number;
  step: number;
  label: string;
  unit?: string;
  prefix?: string;
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
  prefix = '',
  maxLabel
}) => {
  const formatValue = (val: number) => {
    if (val >= max && maxLabel) {
      return maxLabel;
    }
    return `${prefix}${val.toLocaleString()}${unit}`;
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4 text-foreground">
        {label}: {formatValue(value[0])} - {formatValue(value[1])}
      </h3>
      <div className="px-4 space-y-4">
        <div className="relative">
          <Slider
            value={value}
            onValueChange={onValueChange}
            max={max}
            min={min}
            step={step}
            className="w-full range-slider"
          />
          {/* Visual indicators for handles */}
          <div className="absolute top-0 flex items-center justify-center w-4 h-4 bg-primary border-2 border-background rounded-full shadow-md pointer-events-none transform -translate-y-1/2" 
               style={{ left: `${((value[0] - min) / (max - min)) * 100}%`, transform: 'translateX(-50%) translateY(-50%)' }}>
          </div>
          <div className="absolute top-0 flex items-center justify-center w-4 h-4 bg-primary border-2 border-background rounded-full shadow-md pointer-events-none transform -translate-y-1/2" 
               style={{ left: `${((value[1] - min) / (max - min)) * 100}%`, transform: 'translateX(-50%) translateY(-50%)' }}>
          </div>
        </div>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{prefix}{min.toLocaleString()}{unit}</span>
          <span>{maxLabel || `${prefix}${max.toLocaleString()}${unit}`}</span>
        </div>
      </div>
    </div>
  );
};

export default RangeSlider;