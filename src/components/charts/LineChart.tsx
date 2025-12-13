import React from 'react';
import { AreaChart } from './AreaChart';
import type { LineChartProps } from '../../types';

export const LineChart: React.FC<LineChartProps> = ({
	data,
	strokeColor = '#7ED957',
	strokeWidth = 2,
	pointColor,
	...otherProps
}) => {
	return (
		<AreaChart
			{...otherProps}
			data={data}
			strokeColor={strokeColor}
			strokeWidth={strokeWidth}
			fillColor="transparent"
			pointColor={pointColor || strokeColor}
		/>
	);
};
