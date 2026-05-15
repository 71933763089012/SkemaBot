import fs from 'node:fs/promises'
import { fetchSchedule } from '../skema.js'
type Data = [
    {
        cookie: { value: string; experation: number } | undefined
        username: string
        password: string
    },
]

const text = await fs.readFile('./data.json')
const data = JSON.parse(text.toString()) as Data

const schedule = await fetchSchedule(
    { name: data[0].username, password: data[0].password },
    '2026-04-23',
    data[0].cookie,
)

console.log(schedule)
