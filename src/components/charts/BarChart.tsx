import React, { useMemo } from 'react';
import { GroupedStackedBarChart } from './GroupedStackedBarChart';
import type { BarChartProps, GroupedBarData } from '../../types';
import { validateBarData } from '../../utils/validation';

export const BarChart: React.FC<BarChartProps> = ({
	data,
	barColor,
	selectedBarIndex = -1,
	onBarPress,
	onPressOutside,
	deselectOnPressOutside,
	...otherProps
}) => {
	validateBarData(data);

	const transformedData = useMemo<GroupedBarData[]>(() => {
		const defaultColor = barColor || '#7ED957';

		return data.map(item => ({
			category: item.label,
			bars: [
				{
					value: item.value,
					color: item.color || defaultColor,
					label: item.label,
					selectionConfig: item.selectionConfig,
				},
			],
		}));
	}, [data, barColor]);

	const selectedCategoryIndex = useMemo(() => {
		if (selectedBarIndex === -1) {
			return undefined;
		}
		return selectedBarIndex;
	}, [selectedBarIndex]);

	const handleBarPress = useMemo(() => {
		if (!onBarPress) {
			return undefined;
		}

		return (categoryIndex: number, _barIndex?: number) => {
			onBarPress(categoryIndex);
		};
	}, [onBarPress]);

	return (
		<GroupedStackedBarChart
			{...otherProps}
			data={transformedData}
			selectedCategoryIndex={selectedCategoryIndex}
			selectedBarIndex={0}
			onBarPress={handleBarPress}
			onPressOutside={onPressOutside}
			deselectOnPressOutside={deselectOnPressOutside}
			groupGap={otherProps.barGap ?? 8}
			barGap={0}
		/>
	);
};
