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

export { Inbox, InboxEnvelope, InboxMessage }