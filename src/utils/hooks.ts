import { useEffect } from 'react';
import { Easing, useSharedValue, withTiming } from 'react-native-reanimated';

export function useChartAnimation(duration: number, delay: number = 0) {
    const progress = useSharedValue(0);

    useEffect(() => {
        progress.value = 0;
        const timeoutId = setTimeout(() => {
            progress.value = withTiming(1, {
                duration,
                easing: Easing.bezier(0.25, 0.1, 0.25, 1),
            });
        }, delay);

        return () => clearTimeout(timeoutId);
    }, [duration, delay]);

    return progress;
}
