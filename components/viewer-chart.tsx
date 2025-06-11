"use client"

import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts"

export function ViewerChart() {
  // Rich sample data with more data points for a better visualization
  const sampleData = [
    { time: "9:00", viewers: 650 },
    { time: "9:15", viewers: 720 },
    { time: "9:30", viewers: 800 },
    { time: "9:45", viewers: 890 },
    { time: "10:00", viewers: 950 },
    { time: "10:15", viewers: 1100 },
    { time: "10:30", viewers: 1250 },
    { time: "10:45", viewers: 1180 },
    { time: "11:00", viewers: 1300 },
    { time: "11:15", viewers: 1420 },
    { time: "11:30", viewers: 1350 },
    { time: "11:45", viewers: 1234 },
  ]

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={sampleData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
        <XAxis
          dataKey="time"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          interval="preserveStartEnd"
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          width={30}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "0.5rem",
            fontSize: "12px",
          }}
          labelStyle={{ color: "hsl(var(--foreground))" }}
          formatter={(value) => [`${value} viewers`, "Viewers"]}
        />
        <Line
          type="monotone"
          dataKey="viewers"
          stroke="#ea580c"
          strokeWidth={2}
          dot={{ fill: "#ea580c", strokeWidth: 2, r: 3 }}
          activeDot={{ r: 5, fill: "#ea580c", stroke: "#fff", strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
