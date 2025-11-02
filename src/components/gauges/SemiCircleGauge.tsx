import React from 'react';
import { RadialChart } from '../charts/RadialChart';
import type { SemiCircleGaugeProps } from '../../types';

export const SemiCircleGauge: React.FC<SemiCircleGaugeProps> = ({
	progress,
	size = 280,
	strokeWidth = 40,
	cornerRadius = 8,
	backgroundColor,
	animationDuration = 1200,
	color = '#7ED957',
	centerContent,
	contentAlignment = 'flex-end',
}) => {
	const clampedProgress = Math.min(Math.max(progress, 0), 100);
	const segments = [
		{
			value: clampedProgress,
			color: color,
			label: 'Progress',
		},
	];

	return (
		<RadialChart
			segments={segments}
			maxValue={100}
			size={size}
			strokeWidth={strokeWidth}
			cornerRadius={cornerRadius}
			segmentGap={0}
			backgroundColor={backgroundColor || '#F2F2F7'}
			animationDuration={animationDuration}
			startAngle={-180}
			sweepAngle={180}
			viewBoxHeightRatio={0.6}
			centerContent={centerContent}
			contentAlignment={contentAlignment}
		/>
	);
};
