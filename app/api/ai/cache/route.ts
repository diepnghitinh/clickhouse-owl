import { NextResponse } from 'next/server';
import { ClickHouseRepository } from '@/lib/infrastructure/clickhouse/repositories/clickhouse.repository';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';

const cacheSchema = z.object({
    connection: z.object({
        id: z.string(),
        url: z.string(),
        username: z.string().optional(),
        user: z.string().optional(),
        password: z.string().optional(),
        database: z.string().optional()
    }),
    database: z.string(),
    tables: z.array(z.string())
});

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { connection, database, tables } = cacheSchema.parse(body);

        // Normalize connection config
        let connectionConfig: any = connection;
        if (connectionConfig.user && !connectionConfig.username) {
            connectionConfig = {
                ...connectionConfig,
                username: connectionConfig.user
            };
        }

        // Ensure cache directory exists
        const cacheDir = path.join(process.cwd(), 'cache');
        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir);
        }

        const uid4 = connection.id.substring(0, 4);
        const results = [];

        for (const table of tables) {
            try {
                // 1. Fetch Schema
                const schemaQuery = `SHOW CREATE TABLE ${database}.${table}`;
                const schemaRes = await ClickHouseRepository.execute(schemaQuery, database, connectionConfig);
                const schemaStatement = schemaRes.rows?.[0]?.[0] as string;

                if (schemaStatement) {
                    // Sanitize sensitive information (passwords) from schema
                    // Matches: Engine('host', 'db', 'table', 'user', 'password')
                    // We want to replace the 5th argument (password) with [HIDDEN]
                    let sanitizedSchema = schemaStatement;

                    const commonEngines = ['PostgreSQL', 'MySQL', 'MongoDB'];

                    commonEngines.forEach(engine => {
                        // Regex to find the engine definition and capture args
                        const regex = new RegExp(`${engine}\\s*\\(([^)]+)\\)`, 'i');
                        const match = sanitizedSchema.match(regex);

                        if (match) {
                            const fullMatch = match[0];
                            const argsStr = match[1];

                            // Split args by comma, respecting quotes
                            // detailed regex to split usage of ' or "
                            // tailored for ClickHouse SQL format which usually uses single quotes
                            const args = argsStr.split(/,\s*(?=(?:[^']*'[^']*')*[^']*$)/);

                            if (args.length >= 5) {
                                // The 5th argument is usually the password for these engines
                                args[4] = "'[HIDDEN]'";
                                const newArgsStr = args.join(', ');
                                const newEngineDef = `${engine}(${newArgsStr})`;
                                sanitizedSchema = sanitizedSchema.replace(fullMatch, newEngineDef);
                            }
                        }
                    });

                    const schemaPath = path.join(cacheDir, `${uid4}_${database}_${table}_schema.txt`);
                    fs.writeFileSync(schemaPath, sanitizedSchema);
                }


                // 2. Fetch Data Sample
                const dataQuery = `SELECT * FROM ${database}.${table} LIMIT 100`;
                const dataRes = await ClickHouseRepository.execute(dataQuery, database, connectionConfig);

                if (dataRes.rows && dataRes.rows.length > 0) {
                    // Format as easy to read text (CSV-like but with header)
                    const header = dataRes.columns.join(' | ');
                    const rows = dataRes.rows.map(row => row.map(cell => {
                        if (typeof cell === 'object') return JSON.stringify(cell);
                        return String(cell);
                    }).join(' | ')).join('\n');

                    const content = `${header}\n${rows}`;
                    const dataPath = path.join(cacheDir, `${uid4}_${database}_${table}_data.txt`);
                    fs.writeFileSync(dataPath, content);
                }

                results.push({ table, status: 'cached' });

            } catch (error: any) {
                console.error(`Failed to cache table ${table}:`, error);
                results.push({ table, status: 'error', error: error.message });
            }
        }

        return NextResponse.json({ success: true, results });

    } catch (error: any) {
        console.error('Cache API Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to cache data' },
            { status: 500 }
        );
    }
}
