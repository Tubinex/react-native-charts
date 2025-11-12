import React from 'react';
import { RadialChart } from './RadialChart';
import type { SemiCircleChartProps } from '../../types';

export const SemiCircleChart: React.FC<SemiCircleChartProps> = ({
	segments,
	maxValue,
	size = 280,
	strokeWidth = 40,
	cornerRadius = 8,
	segmentGap = 0,
	backgroundColor,
	animationDuration = 1200,
	selectedStrokeWidthIncrease,
	selectionAnimationDuration,
	onSegmentPress,
	selectedSegmentIndex = -1,
	centerContent,
	contentAlignment = 'flex-end',
	onPressOutside,
	chartGestureRef,
	deselectOnPressOutside,
}) => {
	return (
		<RadialChart
			segments={segments}
			maxValue={maxValue}
			size={size}
			strokeWidth={strokeWidth}
			cornerRadius={cornerRadius}
			segmentGap={segmentGap}
			backgroundColor={backgroundColor || '#F2F2F7'}
			animationDuration={animationDuration}
			startAngle={-180}
			sweepAngle={180}
			viewBoxHeightRatio={0.6}
			centerContent={centerContent}
			contentAlignment={contentAlignment}
			onSegmentPress={onSegmentPress}
			selectedSegmentIndex={selectedSegmentIndex}
			selectedStrokeWidthIncrease={selectedStrokeWidthIncrease}
			selectionAnimationDuration={selectionAnimationDuration}
			onPressOutside={onPressOutside}
			chartGestureRef={chartGestureRef}
			deselectOnPressOutside={deselectOnPressOutside}
		/>
	);
};
