import React from 'react';
import { GroupedStackedBarChart } from './GroupedStackedBarChart';
import type { StackedBarChartProps } from '../../types';

export const StackedBarChart: React.FC<StackedBarChartProps> = props => {
	return <GroupedStackedBarChart {...props} />;
};
