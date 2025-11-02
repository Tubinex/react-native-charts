import React from 'react';
import { GroupedStackedBarChart } from './GroupedStackedBarChart';
import type { GroupedBarChartProps } from '../../types';

export const GroupedBarChart: React.FC<GroupedBarChartProps> = ({
	onBarPress,
	selectedBar,
	...otherProps
}) => {
	const handleBarPress = onBarPress
		? (categoryIndex: number, barIndex?: number) => {
				if (barIndex !== undefined) {
					onBarPress(categoryIndex, barIndex);
				}
		  }
		: undefined;

	return (
		<GroupedStackedBarChart
			{...otherProps}
			onBarPress={handleBarPress}
			selectedBar={selectedBar}
		/>
	);
};
