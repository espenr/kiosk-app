import { useEffect, useState } from 'react';

/**
 * A simplified version of the ClockDisplay component for debugging
 */
export default function SimpleClockDisplay() {
  const [time, setTime] = useState(new Date());

  // Update time every second
  useEffect(() => {
    console.log('SimpleClockDisplay component mounted');

    const intervalId = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => {
      console.log('SimpleClockDisplay component unmounted');
      clearInterval(intervalId);
    };
  }, []);

  // Format time and date
  const formattedTime = time.toLocaleTimeString();
  const formattedDate = time.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  console.log('SimpleClockDisplay rendering:', formattedTime, formattedDate);

  return (
    <div className="p-4 border border-white/20 rounded-md">
      <div className="text-3xl font-bold leading-none">
        {formattedTime}
      </div>
      <div className="text-xl mt-2">
        {formattedDate}
      </div>
    </div>
  );
}