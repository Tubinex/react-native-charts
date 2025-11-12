import React from 'react';
import { RadialChart } from '../charts/RadialChart';
import type { DonutGaugeProps } from '../../types';

export const DonutGauge: React.FC<DonutGaugeProps> = ({
	progress,
	size = 260,
	strokeWidth = 34,
	cornerRadius = 8,
	backgroundColor,
	animationDuration = 1200,
	color = '#7ED957',
	centerContent,
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
			startAngle={-90}
			sweepAngle={360}
			viewBoxHeightRatio={1}
			centerContent={centerContent}
			contentAlignment="center"
		/>
	);
};
