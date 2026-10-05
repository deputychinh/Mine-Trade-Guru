import { createMarketSocket } from '@/api/marketSocket'
import type { WorkerInbound, WorkerOutbound } from '@/interfaces/worker'
import { FeedController } from './feedController'
import { FeedEngine } from './feedEngine'

// Web Worker entry: the socket, JSON parsing, validation and delta merging all run here,
// off the main thread (NFR-P1, NFR-P2). This file is glue only; logic lives in
// FeedController / FeedEngine so it can be unit-tested without a worker.

/** The project's tsconfig uses the DOM lib; describe just the worker scope members used here. */
interface WorkerScope {
  postMessage(message: WorkerOutbound): void
  addEventListener(type: 'message', listener: (event: MessageEvent<WorkerInbound>) => void): void
}

const scope = self as unknown as WorkerScope

const controller = new FeedController({
  createSocket: createMarketSocket,
  engine: new FeedEngine(),
  post: (message) => scope.postMessage(message),
})

scope.addEventListener('message', (event) => controller.handle(event.data))
