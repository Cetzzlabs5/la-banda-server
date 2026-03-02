import express, { Express } from 'express'
import morgan from 'morgan'
import authRouter from './routes/authRoute'
import { corsMiddleware } from './config/cors'
import { connectDB } from './config/db'
import cookieParser from 'cookie-parser'

if (process.env.NODE_ENV !== 'production') {
    process.loadEnvFile()
}

connectDB()

const app: Express = express()
app.use(corsMiddleware())
app.use(cookieParser());

// Logging
app.use(morgan('dev'))

app.use(express.json())

// Routes
app.use('/api/auth', authRouter)
app.get('/api', (req, res) => {
    res.send('Hello World!')
})

export default app