import React from 'react';
import { RadialChart } from './RadialChart';
import type { DonutChartProps } from '../../types';

export const DonutChart: React.FC<DonutChartProps> = ({
	segments,
	size = 260,
	strokeWidth = 34,
	cornerRadius = 8,
	segmentGap = 0,
	backgroundColor,
	animationDuration = 1200,
	selectedStrokeWidthIncrease,
	selectionAnimationDuration,
	centerContent,
	onSegmentPress,
	selectedSegmentIndex,
	onPressOutside,
	chartGestureRef,
	deselectOnPressOutside,
}) => {
	return (
		<RadialChart
			segments={segments}
			size={size}
			strokeWidth={strokeWidth}
			cornerRadius={cornerRadius}
			segmentGap={segmentGap}
			backgroundColor={backgroundColor}
			animationDuration={animationDuration}
			startAngle={-90}
			sweepAngle={360}
			viewBoxHeightRatio={1}
			centerContent={centerContent}
			onSegmentPress={onSegmentPress}
			selectedSegmentIndex={selectedSegmentIndex}
			selectedStrokeWidthIncrease={selectedStrokeWidthIncrease}
			selectionAnimationDuration={selectionAnimationDuration}
			onPressOutside={onPressOutside}
			deselectOnPressOutside={deselectOnPressOutside}
			chartGestureRef={chartGestureRef}
		/>
	);
};
