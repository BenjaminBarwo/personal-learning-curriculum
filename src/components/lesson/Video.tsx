'use client'

import React from 'react'
import ReactPlayer from 'react-player'

interface VideoProps {
  url: string
  caption?: string
}

export function Video({ url, caption }: VideoProps) {
  return (
    <figure className="my-6">
      <div
        className="relative w-full overflow-hidden rounded-xl border border-border-subtle bg-surface-secondary"
        style={{ paddingTop: '56.25%' /* 16:9 aspect ratio */ }}
      >
        <div className="absolute inset-0">
          <ReactPlayer
            src={url}
            width="100%"
            height="100%"
            light={true}
            controls={true}
            playsInline
          />
        </div>
      </div>
      {caption && (
        <figcaption className="mt-2 text-center text-xs text-text-muted">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}
