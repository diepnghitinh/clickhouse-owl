
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { ClickHouseRepository } from '@/lib/infrastructure/clickhouse/repositories/clickhouse.repository';
import { MongoClient } from 'mongodb';

function escapeSql(s: string): string {
    return s.replace(/'/g, "''");
}

/** Escape identifier for ClickHouse: use double quotes and escape " as "". */
function quoteIdentifier(name: string): string {
    return `"${name.replace(/"/g, '""')}"`;
}

function inferColumnsFromSample(doc: Record<string, unknown> | null): string {
    const cols: string[] = ['_id String'];
    if (!doc || typeof doc !== 'object') return cols.join(', ');
    const seen = new Set<string>(['_id']);

    const inferType = (val: any): string => {
        if (val === null || val === undefined) return 'String';
        if (typeof val === 'number') {
            return Number.isInteger(val) ? 'Int64' : 'Float64';
        }
        if (typeof val === 'boolean') return 'Bool';
        if (val instanceof Date) return 'DateTime';
        if (typeof val === 'object') {
            if (val._bsontype === 'ObjectId') return 'String';
            if (val._bsontype === 'Long') return 'Int64';
            if (val._bsontype === 'Int32') return 'Int32';
            if (val._bsontype === 'Double') return 'Float64';
            if (val._bsontype === 'Decimal128') return 'Float64';
            if (Array.isArray(val)) {
                if (val.length > 0) {
                    return `Array(${inferType(val[0])})`;
                }
                return 'Array(String)';
            }
            return 'String';
        }
        return 'String';
    };

    for (const [key, value] of Object.entries(doc)) {
        if (seen.has(key)) continue;
        seen.add(key);
        const safe = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key) ? key : quoteIdentifier(key);
        cols.push(`${safe} ${inferType(value)}`);
    }
    return cols.join(', ');
}

export async function POST(request: Request) {
    const session = await getSession();
    if (!session.isAuthenticated) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let mongoClient: MongoClient | null = null;
    try {
        const body = await request.json();
        const { sourceTable, targetTable, targetDatabase, connection } = body;

        if (!sourceTable || !targetTable || !connection) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const { host, port, username, password, database, ssl, authSource } = connection;
        const portNum = parseInt(String(port), 10);
        const user = username ? `'${escapeSql(String(username))}'` : "''";
        const pass = password ? `'${escapeSql(String(password))}'` : "''";
        const authDb = (authSource && String(authSource).trim()) || 'admin';
        const optionsParts = [`authSource=${authDb}`];
        if (ssl) optionsParts.push('ssl=true');
        const options = `'${optionsParts.join('&')}'`;

        const tableName = targetDatabase ? `"${targetDatabase}"."${targetTable}"` : `"${targetTable}"`;
        const hostPort = `${host}:${portNum}`;

        let columns = '_id String';
        const auth = username && password ? `${encodeURIComponent(String(username))}:${encodeURIComponent(String(password))}@` : '';
        const urlParams = new URLSearchParams({ authSource: authDb });
        if (ssl) urlParams.set('retryWrites', 'true');
        if (ssl) urlParams.set('w', 'majority');
        const url = ssl
            ? `mongodb+srv://${auth}${host}/${database}?${urlParams.toString()}`
            : `mongodb://${auth}${host}:${portNum}/${database}?${urlParams.toString()}`;
        mongoClient = new MongoClient(url);
        await mongoClient.connect();
        const sample = await mongoClient.db(database).collection(sourceTable).findOne();
        await mongoClient.close();
        mongoClient = null;
        if (sample && typeof sample === 'object') {
            columns = inferColumnsFromSample(sample as Record<string, unknown>);
        }

        const query = `
            CREATE TABLE ${tableName}
            (${columns})
            ENGINE = MongoDB('${hostPort}', '${escapeSql(database)}', '${escapeSql(sourceTable)}', ${user}, ${pass}, ${options})
        `;

        await ClickHouseRepository.execute(query, undefined, session.connection);

        return NextResponse.json({
            success: true,
            message: `Table ${targetTable} linked to MongoDB collection: ${database}.${sourceTable}`,
        });
    } catch (error: any) {
        console.error("Failed to create table from MongoDB:", error);
        if (mongoClient) {
            try { await mongoClient.close(); } catch { }
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
