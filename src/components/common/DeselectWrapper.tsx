import React, { useRef, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';

interface DeselectWrapperProps {
	children: React.ReactNode;
	onDeselect: () => void;
	enabled?: boolean;
	childGestureRef?: React.RefObject<any>;
}

export const DeselectWrapper: React.FC<DeselectWrapperProps> = ({
	children,
	onDeselect,
	enabled = true,
	childGestureRef,
}) => {
	const tapStartRef = useRef<{ x: number; y: number } | null>(null);
	const childHandledRef = useRef(false);

	const handleDeselectTap = useCallback(() => {
		if (!childHandledRef.current) {
			onDeselect();
		}
	}, [onDeselect]);

	const tapGesture = Gesture.Tap()
		.enabled(enabled)
		.maxDistance(18)
		.maxDuration(280)
		.shouldCancelWhenOutside(false)
		.onBegin(event => {
			tapStartRef.current = { x: event.x, y: event.y };
			childHandledRef.current = false;
		})
		.onEnd(event => {
			'worklet';
			const start = tapStartRef.current;
			tapStartRef.current = null;

			if (start) {
				const dx = event.x - start.x;
				const dy = event.y - start.y;
				const distance = Math.sqrt(dx * dx + dy * dy);

				if (distance < 18) {
					scheduleOnRN(handleDeselectTap);
				}
			}
		})
		.onFinalize(() => {
			tapStartRef.current = null;
		});

	const finalGesture = childGestureRef
		? tapGesture.simultaneousWithExternalGesture(childGestureRef as any)
		: tapGesture;

	return (
		<GestureDetector gesture={finalGesture}>
			<View style={styles.container}>{children}</View>
		</GestureDetector>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
});
