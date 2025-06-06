"use client"

import { useEffect, useState } from "react"
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from "recharts"

export function ViewerChart() {
  const [data, setData] = useState([
    { time: "10:00", viewers: 800 },
    { time: "10:15", viewers: 950 },
    { time: "10:30", viewers: 1100 },
    { time: "10:45", viewers: 1050 },
    { time: "11:00", viewers: 1200 },
    { time: "11:15", viewers: 1350 },
    { time: "11:30", viewers: 1234 },
  ])

  useEffect(() => {
    const interval = setInterval(() => {
      setData((prev) => {
        const newData = [...prev.slice(1)]
        const lastTime = new Date()
        const timeString = lastTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        const lastViewers = prev[prev.length - 1]?.viewers || 1000
        const newViewers = Math.max(500, lastViewers + Math.floor(Math.random() * 200) - 100)

        newData.push({
          time: timeString,
          viewers: newViewers,
        })

        return newData
      })
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="h-32">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis
            dataKey="time"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          />
          <YAxis hide />
          <Line type="monotone" dataKey="viewers" stroke="hsl(24 100% 50%)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
