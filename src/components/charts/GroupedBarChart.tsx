import React from 'react';
import { GroupedStackedBarChart } from './GroupedStackedBarChart';
import type { GroupedBarChartProps } from '../../types';
import { validateGroupedStackedBarData } from '../../utils/validation';

export const GroupedBarChart: React.FC<GroupedBarChartProps> = ({
	data,
	onBarPress,
	selectedCategoryIndex,
	selectedBarIndex,
	onPressOutside,
	deselectOnPressOutside,
	...otherProps
}) => {
	validateGroupedStackedBarData(data);
	const handleBarPress = onBarPress
		? (categoryIndex: number, barIndex?: number) => {
				onBarPress(categoryIndex, barIndex ?? -1);
			}
		: undefined;

	return (
		<GroupedStackedBarChart
			{...otherProps}
			data={data}
			onBarPress={handleBarPress}
			selectedCategoryIndex={selectedCategoryIndex}
			selectedBarIndex={selectedBarIndex}
			onPressOutside={onPressOutside}
			deselectOnPressOutside={deselectOnPressOutside}
		/>
	);
};
