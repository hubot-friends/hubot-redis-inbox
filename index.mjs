import { createClient } from 'redis'

const HUBOT_REDIS_INBOX_URL = process.env.HUBOT_REDIS_INBOX_URL ?? 'redis://localhost:6378'
const HUBOT_REDIS_INBOX_STREAM_NAME = process.env.HUBOT_REDIS_INBOX_STREAM_NAME ?? 'hubot-inbox'

class InboxMessage {
    constructor(id, body) {
        this.id = id
        this.body = body
    }
}

class InboxEnvelope {
    constructor(id, sender, room, occurredAt, recordedAt, message) {
        this.id = id
        this.sender = sender
        this.room = room
        this.occurredAt = occurredAt ?? new Date().toISOString()
        this.recordedAt = recordedAt ?? new Date().toISOString()
        this.message = message
    }
}

class Inbox {
    constructor() {
        this.entries = []
    }

    static Map(textMessage) {
        const { user, room, text } = textMessage
        const envelope = new InboxEnvelope(
            textMessage.id,
            user.user,
            room,
            textMessage.occurredAt,
            textMessage.recordedAt,
            new InboxMessage(textMessage.id, text)
        )
        return envelope
    }
}

export default async robot => {
    const client = createClient({ url: HUBOT_REDIS_INBOX_URL })
    await client.connect()

    const cleanup = async () => {
        try {
            await client.close()
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