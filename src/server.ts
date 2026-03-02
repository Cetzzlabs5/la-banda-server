import express, { Express } from 'express'
import morgan from 'morgan'

import { corsMiddleware } from './config/cors'

if (process.env.NODE_ENV !== 'production') {
    process.loadEnvFile()
}

const app: Express = express()
app.use(corsMiddleware())

// Logging
app.use(morgan('dev'))

app.use(express.json())

// Routes
app.get('/api', (req, res) => {
    res.send('Hello World!')
})

export default app