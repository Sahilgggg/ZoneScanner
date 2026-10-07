import mongoose from 'mongoose'
import { env } from './env.js'

let connected = false

// MongoDB is used as a cache for downloaded candles and index lists. If it is
// not reachable the API still works, keeping the cache in memory instead.
export async function connectDB() {
  mongoose.connection.on('connected', () => {
    connected = true
  })
  mongoose.connection.on('disconnected', () => {
    connected = false
  })
  try {
    await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 3000 })
    connected = true
    console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`)
  } catch (error) {
    connected = false
    console.warn(`MongoDB not available (${error.message}).`)
    console.warn('Continuing with an in-memory cache. Data will be re-downloaded after a restart.')
  }
  return connected
}

export function isDbConnected() {
  return connected && mongoose.connection.readyState === 1
}
