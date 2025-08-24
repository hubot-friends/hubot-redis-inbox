import { createClient } from 'redis'
import { Inbox, InboxEnvelope } from './Inbox.mjs'
import { Outbox } from './Outbox.mjs'

const HUBOT_REDIS_INBOX_URL = process.env.HUBOT_REDIS_INBOX_URL ?? 'redis://localhost:6378'
const HUBOT_REDIS_INBOX_STREAM_NAME = process.env.HUBOT_REDIS_INBOX_STREAM_NAME ?? 'hubot-inbox'
const HUBOT_REDIS_OUTBOX_STREAM_NAME = process.env.HUBOT_REDIS_OUTBOX_STREAM_NAME ?? 'hubot-outbox'
const HUBOT_REDIS_OUTBOX_GROUP_NAME = process.env.HUBOT_REDIS_OUTBOX_GROUP_NAME ?? 'hubot-group'
const HUBOT_REDIS_OUTBOX_CONSUMER_NAME = process.env.HUBOT_REDIS_OUTBOX_CONSUMER_NAME ?? 'consumer1'
export default async robot => {

    const client = createClient({ url: HUBOT_REDIS_INBOX_URL })
    await client.connect()

    const outbox = new Outbox(client, {
        streamName: HUBOT_REDIS_OUTBOX_STREAM_NAME,
        groupName: HUBOT_REDIS_OUTBOX_GROUP_NAME,
        consumerName: HUBOT_REDIS_OUTBOX_CONSUMER_NAME,
    })
    outbox.on('received', async entries => {
        for await (const entry of entries) {
            const message = entry.message
            await robot.adapter.reply({room: message.room, user: message.sender, text: message.body}, message.body)
        }
    })
    await outbox.run()

    const cleanup = async () => {
        try {
            await client.close()
            await outbox.close()
        } catch (err) {
            // ignore errors on close
        }
        process.exit()
    }

    process.on('SIGINT', cleanup)
    process.on('SIGTERM', cleanup)
    process.on('uncaughtException', cleanup)

    robot.listen(()=>true, {}, async resp => {
        if (resp.message.text.replace(`${robot.name} `, '').length === 0) return
        const entry = Inbox.Map(resp.message)
        await client.xAdd(HUBOT_REDIS_INBOX_STREAM_NAME, '*', {
            kind: InboxEnvelope.name,
            recordedAt: new Date().toISOString(),
            occurredAt: new Date().toISOString(),
            id: entry.id.toString(),
            sender: entry.sender ?? '',
            room: entry.room,
            body: entry.message.body,
        })
    })
}