# @tubinex/react-native-charts

A collection of beautiful, customizable, and performant chart components for React Native.

[![NPM Version](https://img.shields.io/npm/v/@tubinex/react-native-charts.svg)](https://www.npmjs.com/package/@tubinex/react-native-charts)
[![License](https://img.shields.io/npm/l/@tubinex/react-native-charts.svg)](https://github.com/Tubinex/react-native-charts/blob/main/LICENSE)

## Features

- **Beautiful Animations** - Smooth animations powered by Reanimated 2
- **Interactive** - Built-in tap gesture support for charts
- **Highly Customizable** - Extensive props for styling and behavior
- **TypeScript** - Full TypeScript support

## Components

### Charts

- **BarChart** - Animated vertical bar chart with Y-axis labels and interactive bar selection
- **DonutChart** - Full circle chart with multiple segments
- **SemiCircleChart** - Half circle chart with multiple segments
- **RadialChart** - Base component for custom radial charts

### Gauges

- **DonutGauge** - Full circle progress gauge
- **SemiCircleGauge** - Half circle progress gauge
- **RadialGauge** - Base component for custom gauges

## Installation

```bash
npm install @tubinex/react-native-charts
# or
yarn add @tubinex/react-native-charts
```

### Peer Dependencies

This library requires the following peer dependencies:

```bash
npm install react-native-svg react-native-reanimated react-native-gesture-handler
# or
yarn add react-native-svg react-native-reanimated react-native-gesture-handler
```

**Important**: After installing `react-native-reanimated`, add the Reanimated plugin to your `babel.config.js`:

```javascript
module.exports = {
	...
	plugins: [
		'react-native-worklets/plugin' // Add this line
	]
};
```

## Quick Start

```tsx
import { Text, View } from 'react-native';
import {
	BarChart,
	DonutChart,
	SemiCircleChart,
	DonutGauge,
	SemiCircleGauge,
} from '@tubinex/react-native-charts';

// Bar Chart with interactive selection
const [selectedBar, setSelectedBar] = useState(-1);

<BarChart
	data={[
		{ value: 120, label: 'Mon' },
		{ value: 250, label: 'Tue' },
		{ value: 180, label: 'Wed' },
	]}
	selectedBarIndex={selectedBar}
	onBarPress={(index) => setSelectedBar(index === selectedBar ? -1 : index)}
	valueFormatter={(value) => `$${value}`}
/>

// Donut Chart with custom center content
<DonutChart
	segments={[
		{ value: 100, color: '#FF5733', label: 'Food' },
		{ value: 50, color: '#3357FF', label: 'Transport' },
		{ value: 75, color: '#33FF57', label: 'Entertainment' },
	]}
	centerContent={
		<View>
			<Text style={{ fontSize: 14, color: '#8E8E93' }}>Total</Text>
			<Text style={{ fontSize: 28, fontWeight: '700' }}>$225</Text>
		</View>
	}
/>

// Donut Gauge with custom content
<DonutGauge
	progress={75}
	color="#7ED957"
	centerContent={
		<View>
			<Text style={{ fontSize: 14, color: '#8E8E93' }}>Progress</Text>
			<Text style={{ fontSize: 28, fontWeight: '700' }}>75%</Text>
		</View>
	}
/>

// SemiCircle Chart with custom content
<SemiCircleChart
	segments={[
		{ value: 300, color: '#7ED957', label: 'Savings' },
		{ value: 200, color: '#FFB800', label: 'Spending' },
	]}
	centerContent={
		<View>
			<Text style={{ fontSize: 14, color: '#8E8E93' }}>Balance</Text>
			<Text style={{ fontSize: 36, fontWeight: '700' }}>$500</Text>
		</View>
	}
	contentAlignment="flex-end"
/>

// SemiCircle Gauge
<SemiCircleGauge
	progress={65}
	color="#FFB800"
	centerContent={
		<View>
			<Text style={{ fontSize: 14, color: '#8E8E93' }}>Battery</Text>
			<Text style={{ fontSize: 36, fontWeight: '700' }}>65%</Text>
		</View>
	}
/>
```

## Global Touch Provider Setup

Wrap your application with the `GlobalTouchProvider` so charts can observe touches without stealing gestures. From any `onPressOutside` handler you can call `event.preventDefault()` to keep the current selection active, for example when a different pressable already consumed the tap.

```tsx
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { GlobalTouchProvider } from '@tubinex/react-native-charts';

export default function App() {
	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<GlobalTouchProvider>
				...
			</GlobalTouchProvider>
		</GestureHandlerRootView>
	);
}
```

## API Reference

### BarChart

Animated vertical bar chart with interactive bar selection.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `BarData[]` | **required** | Array of data points for the bars |
| `width` | `number` | `320` | Width of the chart in pixels |
| `height` | `number` | `180` | Height of the chart in pixels |
| `barColor` | `string` | `'#7ED957'` | Default color for bars (can be overridden per bar) |
| `cornerRadius` | `number \| CornerRadius` | `6` | Corner radius for bars |
| `barGap` | `number` | `8` | Gap between bars in pixels |
| `showValues` | `boolean` | `false` | Whether to show value labels above bars |
| `valueFormatter` | `(value: number) => string` | `undefined` | Custom formatter for value labels |
| `animationDuration` | `number` | `1000` | Duration of animation in milliseconds |
| `maxValue` | `number` | `auto` | Override max value for Y-axis scaling |
| `xAxis` | `AxisConfig` | `undefined` | X-axis configuration (labels, ticks, grid) |
| `yAxis` | `AxisConfig` | `undefined` | Y-axis configuration (labels, ticks, grid) |
| `onBarPress` | `(index: number) => void` | `undefined` | Callback when a bar is pressed |
| `selectedBarIndex` | `number` | `-1` | Index of currently selected bar |
| `selectionStyle` | `SelectionStyleConfig` | `undefined` | Configuration for selected bar appearance (color, scale, border) |
| `onPressOutside` | `(event: ChartPressOutsideEvent) => void` | `undefined` | Called when a touch occurs outside the chart while a bar is selected |
| `deselectOnPressOutside` | `boolean` | `false` | Automatically clear selection after outside touches unless `event.preventDefault()` is called |
| `chartGestureRef` | `React.RefObject<any>` | `undefined` | Ref for the chart's gesture handler |

#### Types

```typescript
interface BarData {
	value: number;
	label: string;
	color?: string;
	showValue?: boolean;
	selectionConfig?: ItemSelectionConfig;
}
```

#### Example

```tsx
const [selectedBar, setSelectedBar] = useState(-1);

<BarChart
	data={[
		{ value: 120, label: 'Mon', color: '#3B82F6' },
		{ value: 250, label: 'Tue', color: '#10B981' },
		{ value: 180, label: 'Wed', color: '#F59E0B' },
	]}
	selectedBarIndex={selectedBar}
	selectionStyle={{ color: '#2563EB', scale: 1.1 }}
	onBarPress={(index) => setSelectedBar(index === selectedBar ? -1 : index)}
	valueFormatter={(value) => `$${value.toFixed(2)}`}
	width={320}
	height={200}
	barGap={12}
	yAxis={{ show: true }}
/>
```

---

### DonutChart

Full circle chart with multiple segments and custom center content.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `segments` | `ChartSegment[]` | **required** | Array of segments to display |
| `size` | `number` | `260` | Size (width/height) in pixels |
| `strokeWidth` | `number` | `34` | Thickness of the ring |
| `cornerRadius` | `number` | `8` | Corner radius for segment ends |
| `segmentGap` | `number` | `0` | Gap between segments in degrees |
| `backgroundColor` | `string` | `undefined` | Background ring color |
| `animationDuration` | `number` | `1200` | Animation duration in milliseconds |
| `centerContent` | `React.ReactNode` | `undefined` | Custom content for center |
| `onSegmentPress` | `(index: number) => void` | `undefined` | Callback when segment is tapped |
| `selectedSegmentIndex` | `number` | `-1` | Currently selected segment index |
| `selectedStrokeWidthIncrease` | `number` | `15` | Additional stroke width for selected segment |
| `selectionAnimationDuration` | `number` | `200` | Duration of selection animation |
| `onPressOutside` | `(event: ChartPressOutsideEvent) => void` | `undefined` | Called when a touch occurs outside the chart |
| `deselectOnPressOutside` | `boolean` | `false` | Automatically clear selection on outside touches |
| `chartGestureRef` | `React.RefObject<any>` | `undefined` | Ref for the chart's gesture handler |

#### Types

```typescript
interface ChartSegment {
	value: number;
	color: string;
	label?: string;
}
```

#### Example

```tsx
const [selectedIndex, setSelectedIndex] = useState(-1);

<DonutChart
	segments={[
		{ value: 100, color: '#FF5733', label: 'Food' },
		{ value: 50, color: '#3357FF', label: 'Transport' },
		{ value: 75, color: '#33FF57', label: 'Entertainment' },
	]}
	centerContent={
		<View style={{ alignItems: 'center' }}>
			<Text style={{ fontSize: 14, color: '#8E8E93' }}>Total Spent</Text>
			<Text style={{ fontSize: 28, fontWeight: '700' }}>$225</Text>
		</View>
	}
	selectedSegmentIndex={selectedIndex}
	onSegmentPress={(index) => {
		setSelectedIndex(index === selectedIndex ? -1 : index);
	}}
/>
```

---

### DonutGauge

Full circle progress gauge for single progress values.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `progress` | `number` (0-100) | **required** | Progress percentage |
| `color` | `string` | `'#7ED957'` | Color for the progress segment |
| `size` | `number` | `260` | Size (width/height) in pixels |
| `strokeWidth` | `number` | `34` | Thickness of the ring |
| `cornerRadius` | `number` | `8` | Corner radius for segment ends |
| `backgroundColor` | `string` | `'#F2F2F7'` | Background ring color |
| `animationDuration` | `number` | `1200` | Animation duration in milliseconds |
| `centerContent` | `React.ReactNode` | `undefined` | Custom content for center |

#### Example

```tsx
<DonutGauge
	progress={85}
	color="#7ED957"
	size={200}
	strokeWidth={30}
	centerContent={
		<View style={{ alignItems: 'center' }}>
			<Text style={{ fontSize: 14, color: '#8E8E93' }}>Saved</Text>
			<Text style={{ fontSize: 28, fontWeight: '700' }}>$850</Text>
		</View>
	}
/>
```

---

### SemiCircleChart

Half circle chart with multiple segments and custom center content.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `segments` | `ChartSegment[]` | **required** | Array of segments to display |
| `maxValue` | `number` | `auto` | Override max value for segment scaling |
| `size` | `number` | `280` | Size (width/height) in pixels |
| `strokeWidth` | `number` | `40` | Thickness of the gauge ring |
| `cornerRadius` | `number` | `8` | Corner radius for segment ends |
| `segmentGap` | `number` | `0` | Gap between segments in degrees |
| `backgroundColor` | `string` | `'#F2F2F7'` | Background gauge color |
| `animationDuration` | `number` | `1200` | Animation duration in milliseconds |
| `centerContent` | `React.ReactNode` | `undefined` | Custom content for center |
| `contentAlignment` | `'center' \| 'flex-start' \| 'flex-end'` | `'flex-end'` | Center content alignment |
| `onSegmentPress` | `(index: number) => void` | `undefined` | Callback when segment is tapped |
| `selectedSegmentIndex` | `number` | `-1` | Currently selected segment index |
| `selectedStrokeWidthIncrease` | `number` | `15` | Additional stroke width for selected segment |
| `selectionAnimationDuration` | `number` | `200` | Duration of selection animation |
| `onPressOutside` | `(event: ChartPressOutsideEvent) => void` | `undefined` | Called when a touch occurs outside the chart |
| `deselectOnPressOutside` | `boolean` | `false` | Automatically clear selection on outside touches |
| `chartGestureRef` | `React.RefObject<any>` | `undefined` | Ref for the chart's gesture handler |

#### Example

```tsx
<SemiCircleChart
	segments={[
		{ value: 400, color: '#7ED957', label: 'Savings' },
		{ value: 300, color: '#FFB800', label: 'Spending' },
		{ value: 100, color: '#FF5C5C', label: 'Bills' },
	]}
	size={300}
	strokeWidth={45}
	segmentGap={3}
	centerContent={
		<View style={{ alignItems: 'center' }}>
			<Text style={{ fontSize: 14, color: '#8E8E93' }}>Budget</Text>
			<Text style={{ fontSize: 36, fontWeight: '700' }}>$800</Text>
		</View>
	}
	contentAlignment="flex-end"
/>
```

---

### SemiCircleGauge

Half circle progress gauge for single progress values.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `progress` | `number` (0-100) | **required** | Progress percentage |
| `color` | `string` | `'#7ED957'` | Color for the progress segment |
| `size` | `number` | `280` | Size (width/height) in pixels |
| `strokeWidth` | `number` | `40` | Thickness of the gauge ring |
| `cornerRadius` | `number` | `8` | Corner radius for segment ends |
| `backgroundColor` | `string` | `'#F2F2F7'` | Background gauge color |
| `animationDuration` | `number` | `1200` | Animation duration in milliseconds |
| `centerContent` | `React.ReactNode` | `undefined` | Custom content for center |
| `contentAlignment` | `'center' \| 'flex-start' \| 'flex-end'` | `'flex-end'` | Center content alignment |

#### Example

```tsx
<SemiCircleGauge
	progress={65}
	color="#FFB800"
	centerContent={
		<View style={{ alignItems: 'center' }}>
			<Text style={{ fontSize: 14, color: '#8E8E93' }}>Battery</Text>
			<Text style={{ fontSize: 36, fontWeight: '700' }}>65%</Text>
		</View>
	}
	contentAlignment="flex-end"
/>
```

---

### RadialChart

Radial/circular chart component for custom implementations.

See `RadialGauge` for gauge-specific wrapper.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `segments` | `ChartSegment[]` | **required** | Array of segments to display |
| `maxValue` | `number` | `auto` | Override max value for segment scaling |
| `size` | `number` | `280` | Size (width/height) in pixels |
| `strokeWidth` | `number` | `40` | Thickness of the ring |
| `cornerRadius` | `number` | `8` | Corner radius for segment ends |
| `segmentGap` | `number` | `0` | Gap between segments in degrees |
| `startAngle` | `number` | `-90` | Starting angle in degrees (-90 is top) |
| `sweepAngle` | `number` | `360` | Total sweep angle (360 = full circle, 180 = half circle) |
| `viewBoxHeightRatio` | `number` | `1` | Height ratio for viewBox (0.6 for semicircle) |
| `centerContent` | `React.ReactNode` | `undefined` | Custom content for center |
| `closedLoop` | `boolean` | `false` | Include gap after last segment |
| `contentAlignment` | `'center' \| 'flex-start' \| 'flex-end'` | `'center'` | Center content alignment |
| `backgroundColor` | `string` | `undefined` | Background ring color |
| `animationDuration` | `number` | `1200` | Animation duration in milliseconds |
| `onSegmentPress` | `(index: number) => void` | `undefined` | Callback when segment is tapped |
| `selectedSegmentIndex` | `number` | `-1` | Currently selected segment index |
| `selectedStrokeWidthIncrease` | `number` | `15` | Additional stroke width for selected segment |
| `selectionAnimationDuration` | `number` | `200` | Duration of selection animation |
| `selectionExpandMode` | `'scale' \| 'expand'` | `'expand'` | How selection expands (scale = stroke width, expand = radius) |
| `onPressOutside` | `(event: ChartPressOutsideEvent) => void` | `undefined` | Called when a touch occurs outside the chart |
| `deselectOnPressOutside` | `boolean` | `false` | Automatically clear selection on outside touches |
| `chartGestureRef` | `React.RefObject<any>` | `undefined` | Ref for the chart's gesture handler |

---

## TypeScript Support

Full TypeScript support with comprehensive type definitions:

```typescript
import type {
	BarData,
	BarChartProps,
	ChartSegment,
	DonutChartProps,
	SemiCircleChartProps,
	DonutGaugeProps,
	SemiCircleGaugeProps,
	RadialChartProps,
	ContentAlignment,
} from '@tubinex/react-native-charts';
```

## Performance Tips

1. **Memoize data arrays** - Use `useMemo` to prevent unnecessary re-renders
2. **Avoid inline functions** - Define callbacks outside render
3. **Limit segments** - Keep segments under 20 for optimal performance
4. **Memoize center content** - Use `useMemo` for complex center content

```tsx
const data = useMemo(
	() => [
		{ value: 100, label: 'A' },
		{ value: 200, label: 'B' },
	],
	[]
);

const handlePress = useCallback((index: number) => {
	console.log('Pressed:', index);
}, []);

const centerContent = useMemo(
	() => (
		<View>
			<Text>Total</Text>
			<Text>$300</Text>
		</View>
	),
	[]
);

<DonutChart
	segments={data}
	onSegmentPress={handlePress}
	centerContent={centerContent}
/>
```

## License

MIT © [Tubinex](https://github.com/Tubinex)

## Credits

Built with:
- [react-native-svg](https://github.com/software-mansion/react-native-svg)
- [react-native-reanimated](https://github.com/software-mansion/react-native-reanimated)
- [react-native-gesture-handler](https://github.com/software-mansion/react-native-gesture-handler)
