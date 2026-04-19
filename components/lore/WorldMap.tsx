'use client'
import { useEffect, useState } from 'react'
import * as topojson from 'topojson-client'

const W = 960
const H = 480

function project(lon: number, lat: number): [number, number] {
  return [
    ((lon + 180) / 360) * W,
    ((90 - lat) / 180) * H,
  ]
}

function geomToPath(geometry: any): string {
  if (!geometry) return ''
  const rings: number[][][] =
    geometry.type === 'MultiPolygon'
      ? geometry.coordinates.flatMap((poly: number[][][]) => poly)
      : geometry.coordinates
  return rings
    .map((ring: number[][]) =>
      ring
        .map(([lon, lat]: number[], i: number) => {
          const [x, y] = project(lon, lat)
          return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
        })
        .join('') + 'Z'
    )
    .join(' ')
}

interface MapYarn {
  id: string
  latitude: number
  longitude: number
}

export default function WorldMap({
  mapYarns,
  heartCounts,
}: {
  mapYarns: MapYarn[]
  heartCounts: Record<string, number>
}) {
  const [paths, setPaths] = useState<string[]>([])

  useEffect(() => {
    import('world-atlas/countries-110m.json').then((module) => {
      const world = module.default as any
      const countries = topojson.feature(world, world.objects.countries) as any
      setPaths((countries.features as any[]).map((f: any) => geomToPath(f.geometry)))
    })
  }, [])

  // Find most-hearted yarn with a location
  const mostHeartedId =
    mapYarns.reduce(
      (best, y) => {
        const count = heartCounts[y.id] || 0
        return count > (heartCounts[best] || 0) && count > 0 ? y.id : best
      },
      ''
    ) || null

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', height: '100%', display: 'block', background: '#fff' }}
    >
      {paths.map((d, i) => (
        <path key={i} d={d} fill="#000" stroke="none" />
      ))}
      {mapYarns.map((y) => {
        const [cx, cy] = project(y.longitude, y.latitude)
        const isGold = y.id === mostHeartedId
        return (
          <circle
            key={y.id}
            cx={cx}
            cy={cy}
            r={isGold ? 5 : 3}
            fill={isGold ? '#C8922A' : '#fff'}
          />
        )
      })}
    </svg>
  )
}
