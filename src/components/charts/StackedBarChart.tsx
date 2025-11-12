import React from 'react';
import { GroupedStackedBarChart } from './GroupedStackedBarChart';
import type { StackedBarChartProps } from '../../types';
import { validateGroupedStackedBarData } from '../../utils/validation';

export const StackedBarChart: React.FC<StackedBarChartProps> = ({
	data,
	groupGap,
	selectedCategoryIndex,
	selectedSegmentIndex,
	onPressOutside,
	deselectOnPressOutside,
	...otherProps
}) => {
	validateGroupedStackedBarData(data);

	return (
		<GroupedStackedBarChart
			{...otherProps}
			data={data}
			groupGap={groupGap}
			selectedCategoryIndex={selectedCategoryIndex}
			selectedSegmentIndex={selectedSegmentIndex}
			onPressOutside={onPressOutside}
			deselectOnPressOutside={deselectOnPressOutside}
		/>
	);
};
