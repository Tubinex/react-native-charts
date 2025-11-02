import React from 'react';
import { RadialChart } from '../charts/RadialChart';
import type { RadialGaugeProps } from '../../types';

export const RadialGauge: React.FC<RadialGaugeProps> = ({
	progress,
	size = 280,
	strokeWidth = 40,
	cornerRadius = 8,
	backgroundColor,
	animationDuration = 1200,
	color = '#7ED957',
	startAngle = -90,
	sweepAngle = 360,
	viewBoxHeightRatio = 1,
	centerContent,
	contentAlignment = 'center',
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
			startAngle={startAngle}
			sweepAngle={sweepAngle}
			viewBoxHeightRatio={viewBoxHeightRatio}
			centerContent={centerContent}
			contentAlignment={contentAlignment}
		/>
	);
};
