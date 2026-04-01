export function normalizeClickHouseUrl(input: string) {
    const trimmed = input.trim();

    if (!trimmed) {
        throw new Error('ClickHouse URL is required');
    }

    const withProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed)
        ? trimmed
        : `http://${trimmed}`;

    let parsed: URL;

    try {
        parsed = new URL(withProtocol);
    } catch {
        throw new Error('Invalid ClickHouse URL');
    }

    if (!parsed.hostname) {
        throw new Error('Invalid ClickHouse URL');
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('ClickHouse URL must use http or https');
    }

    if (!parsed.port) {
        parsed.port = parsed.protocol === 'https:' ? '8443' : '8123';
    }

    return parsed.toString().replace(/\/$/, '');
}

export function normalizeConnectionLike<T extends { url: string }>(connection: T): T {
    return {
        ...connection,
        url: normalizeClickHouseUrl(connection.url),
    };
}
