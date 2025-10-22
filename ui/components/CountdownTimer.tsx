"use client";

import { useState, useEffect } from "react";

interface CountdownTimerProps {
  deadline: number; // Unix timestamp in seconds
}

export default function CountdownTimer({ deadline }: CountdownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isPast: false,
  });

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = Math.floor(Date.now() / 1000);
      const diff = deadline - now;

      if (diff <= 0) {
        setTimeRemaining({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isPast: true,
        });
        return;
      }

      const days = Math.floor(diff / 86400);
      const hours = Math.floor((diff % 86400) / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;

      setTimeRemaining({
        days,
        hours,
        minutes,
        seconds,
        isPast: false,
      });
    };

    // Calculate immediately
    calculateTimeRemaining();

    // Update every second
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [deadline]);

  if (timeRemaining.isPast) {
    return (
      <div className="text-center py-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-2xl font-bold text-red-600 dark:text-red-400">⚠️ DEADLINE PASSED</p>
        <p className="text-sm text-red-700 dark:text-red-300 mt-2">
          Beneficiaries can now claim their inheritance
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <div className="grid grid-cols-4 gap-4">
        <div className="text-center">
          <div className="bg-purple-100 dark:bg-purple-900/30 rounded-lg p-4">
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {String(timeRemaining.days).padStart(2, "0")}
            </p>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 font-medium">Days</p>
        </div>
        <div className="text-center">
          <div className="bg-purple-100 dark:bg-purple-900/30 rounded-lg p-4">
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {String(timeRemaining.hours).padStart(2, "0")}
            </p>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 font-medium">Hours</p>
        </div>
        <div className="text-center">
          <div className="bg-purple-100 dark:bg-purple-900/30 rounded-lg p-4">
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {String(timeRemaining.minutes).padStart(2, "0")}
            </p>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 font-medium">Minutes</p>
        </div>
        <div className="text-center">
          <div className="bg-purple-100 dark:bg-purple-900/30 rounded-lg p-4">
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {String(timeRemaining.seconds).padStart(2, "0")}
            </p>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 font-medium">Seconds</p>
        </div>
      </div>
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Deadline: {new Date(deadline * 1000).toLocaleString()}
        </p>
      </div>
    </div>
  );
}
